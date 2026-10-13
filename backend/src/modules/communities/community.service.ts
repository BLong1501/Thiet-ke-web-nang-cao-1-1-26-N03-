import { CampaignStatus, Community } from "@prisma/client";
import { AppError } from "../../core/errors/app.error";
import { generateUniqueSlug } from "../../core/utils/slug.util";
import { pageMeta, skipOf, PaginationQuery } from "../../core/utils/pagination.util";
import { communityRepository, CommunityRepository } from "./community.repository";
import { prisma } from "../../core/database/prisma";
import { isOwner } from "../../core/auth/object-access";
import type {
  CreateCommentInput,
  CreateCommunityInput,
  CreatePostInput,
} from "./community.validation";

const communityDto = (c: Community, isJoined: boolean) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  description: c.description,
  isPrivate: c.isPrivate,
  memberCount: c.memberCount,
  isJoined,
  createdAt: c.createdAt,
});

export class CommunityService {
  constructor(private repo: CommunityRepository = communityRepository) {}

  /** Lấy nhóm và đảm bảo người xem có quyền đọc (nhóm riêng tư chỉ dành cho thành viên). */
  private async getReadable(communityId: string, userId?: string) {
    const community = await this.repo.findById(communityId);
    if (!community) throw new AppError("Không tìm thấy cộng đồng", 404);
    if (community.isPrivate && !(userId && (await this.repo.isMember(communityId, userId)))) {
      throw new AppError("Đây là cộng đồng riêng tư dành cho thành viên", 403);
    }
    return community;
  }

  /** Đăng bài / thích / bình luận: phải là thành viên của đúng cộng đồng đó. */
  private async requireMember(communityId: string, userId: string) {
    await this.getReadable(communityId, userId);
    if (!(await this.repo.isMember(communityId, userId))) {
      throw new AppError("Bạn cần tham gia cộng đồng để thực hiện thao tác này", 403);
    }
  }

  async list(query: PaginationQuery, userId?: string) {
    const { items, total } = await this.repo.list(
      this.repo.visibleWhere(userId),
      skipOf(query.page, query.limit),
      query.limit,
    );
    const joined = userId
      ? await this.repo.joinedIds(userId, items.map((c) => c.id))
      : new Set<string>();
    return {
      items: items.map((c) => communityDto(c, joined.has(c.id))),
      meta: pageMeta(query.page, query.limit, total),
    };
  }

  async create(userId: string, input: CreateCommunityInput) {
    const community = await this.repo.createWithOwner(
      {
        name: input.name,
        description: input.description,
        isPrivate: input.isPrivate,
        slug: generateUniqueSlug(input.name).slice(0, 180),
      },
      userId,
    );
    return communityDto(community, true);
  }

  /** Bật/tắt tư cách thành viên. Số thành viên luôn được tính lại từ bảng gốc để không lệch. */
  async toggleJoin(userId: string, communityId: string) {
    const community = await this.repo.findById(communityId);
    if (!community) throw new AppError("Không tìm thấy cộng đồng", 404);

    return this.repo.transaction(async (tx) => {
      const existing = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId } },
      });
      if (existing) {
        if (community.creatorId === userId) {
          throw new AppError("Người tạo cộng đồng không thể rời nhóm", 400);
        }
        await tx.communityMember.deleteMany({ where: { communityId, userId } });
        const memberCount = await this.repo.syncMemberCount(tx, communityId);
        return { isJoined: false, memberCount };
      }
      if (community.isPrivate) {
        throw new AppError("Cộng đồng riêng tư chỉ tham gia khi được mời", 403);
      }
      // skipDuplicates: hai request đồng thời không gây lỗi trùng khoá.
      await tx.communityMember.createMany({
        data: [{ communityId, userId }],
        skipDuplicates: true,
      });
      const memberCount = await this.repo.syncMemberCount(tx, communityId);
      return { isJoined: true, memberCount };
    });
  }

  async listPosts(communityId: string, query: PaginationQuery, userId?: string) {
    await this.getReadable(communityId, userId);
    const { items, total } = await this.repo.listPosts(
      communityId,
      skipOf(query.page, query.limit),
      query.limit,
    );
    const liked = userId
      ? await this.repo.likedPostIds(userId, items.map((p) => p.id))
      : new Set<string>();
    return {
      items: items.map((p) => ({
        id: p.id,
        author: p.author,
        content: p.content,
        campaignId: p.campaignId,
        createdAt: p.createdAt,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        isLiked: liked.has(p.id),
      })),
      meta: pageMeta(query.page, query.limit, total),
    };
  }

  async createPost(userId: string, communityId: string, input: CreatePostInput) {
    await this.requireMember(communityId, userId);
    if (input.campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: input.campaignId },
        select: { id: true, status: true, fundraiserId: true },
      });
      if (!campaign) throw new AppError("Chiến dịch gắn kèm không tồn tại", 404);
      if (
        campaign.status !== CampaignStatus.ACTIVE &&
        !isOwner({ userId, role: "USER" }, campaign.fundraiserId)
      ) {
        throw new AppError("Chỉ được gắn chiến dịch đang gây quỹ hoặc chiến dịch của bạn", 403);
      }
    }
    const post = await this.repo.createPost({
      communityId,
      authorId: userId,
      content: input.content,
      campaignId: input.campaignId ?? null,
    });
    return {
      id: post.id,
      author: post.author,
      content: post.content,
      campaignId: post.campaignId,
      createdAt: post.createdAt,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
    };
  }

  /** Bật/tắt thích; ràng buộc UNIQUE(post_id,user_id) chặn like trùng ở tầng DB. */
  async toggleLike(userId: string, communityId: string, postId: string) {
    await this.requireMember(communityId, userId);
    const post = await this.repo.findPostInCommunity(postId, communityId);
    if (!post) throw new AppError("Không tìm thấy bài viết", 404);

    return this.repo.transaction(async (tx) => {
      const removed = await tx.postLike.deleteMany({ where: { postId, userId } });
      let isLiked = false;
      if (removed.count === 0) {
        await tx.postLike.createMany({ data: [{ postId, userId }], skipDuplicates: true });
        isLiked = true;
      }
      const likeCount = await tx.postLike.count({ where: { postId } });
      await tx.communityPost.update({ where: { id: postId }, data: { likeCount } });
      return { isLiked, likeCount };
    });
  }

  async listComments(
    communityId: string,
    postId: string,
    query: PaginationQuery,
    userId?: string,
  ) {
    await this.getReadable(communityId, userId);
    if (!(await this.repo.findPostInCommunity(postId, communityId))) {
      throw new AppError("Không tìm thấy bài viết", 404);
    }
    const { items, total } = await this.repo.listComments(
      postId,
      skipOf(query.page, query.limit),
      query.limit,
    );
    return {
      items: items.map((c) => ({
        id: c.id,
        author: c.user,
        content: c.content,
        createdAt: c.createdAt,
      })),
      meta: pageMeta(query.page, query.limit, total),
    };
  }

  async createComment(
    userId: string,
    communityId: string,
    postId: string,
    input: CreateCommentInput,
  ) {
    await this.requireMember(communityId, userId);
    if (!(await this.repo.findPostInCommunity(postId, communityId))) {
      throw new AppError("Không tìm thấy bài viết", 404);
    }
    return this.repo.transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { postId, userId, content: input.content },
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
      });
      const commentCount = await tx.comment.count({ where: { postId } });
      await tx.communityPost.update({ where: { id: postId }, data: { commentCount } });
      return {
        id: comment.id,
        author: comment.user,
        content: comment.content,
        createdAt: comment.createdAt,
      };
    });
  }
}

export const communityService = new CommunityService();
