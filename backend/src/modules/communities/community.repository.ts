import { CommunityMemberRole, Prisma } from "@prisma/client";
import { prisma } from "../../core/database/prisma";

type Tx = Prisma.TransactionClient;

export class CommunityRepository {
  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return prisma.$transaction(fn);
  }

  findById(id: string) {
    return prisma.community.findUnique({ where: { id } });
  }

  isMember(communityId: string, userId: string) {
    return prisma.communityMember
      .count({ where: { communityId, userId } })
      .then((n) => n > 0);
  }

  /** Nhóm công khai, hoặc nhóm riêng tư mà user là thành viên. */
  visibleWhere(userId?: string): Prisma.CommunityWhereInput {
    return userId
      ? { OR: [{ isPrivate: false }, { members: { some: { userId } } }] }
      : { isPrivate: false };
  }

  async list(where: Prisma.CommunityWhereInput, skip: number, take: number) {
    const [items, total] = await Promise.all([
      prisma.community.findMany({
        where,
        orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      prisma.community.count({ where }),
    ]);
    return { items, total };
  }

  async joinedIds(userId: string, communityIds: string[]): Promise<Set<string>> {
    if (!communityIds.length) return new Set();
    const rows = await prisma.communityMember.findMany({
      where: { userId, communityId: { in: communityIds } },
      select: { communityId: true },
    });
    return new Set(rows.map((r) => r.communityId));
  }

  createWithOwner(
    data: { name: string; slug: string; description: string; isPrivate: boolean },
    creatorId: string,
  ) {
    return prisma.community.create({
      data: {
        ...data,
        creatorId,
        memberCount: 1,
        members: { create: { userId: creatorId, role: CommunityMemberRole.ADMIN } },
      },
    });
  }

  async syncMemberCount(tx: Tx, communityId: string) {
    const count = await tx.communityMember.count({ where: { communityId } });
    await tx.community.update({ where: { id: communityId }, data: { memberCount: count } });
    return count;
  }

  async listPosts(communityId: string, skip: number, take: number) {
    const where = { communityId };
    const [items, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
      }),
      prisma.communityPost.count({ where }),
    ]);
    return { items, total };
  }

  async likedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
    if (!postIds.length) return new Set();
    const rows = await prisma.postLike.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    return new Set(rows.map((r) => r.postId));
  }

  createPost(data: Prisma.CommunityPostUncheckedCreateInput) {
    return prisma.communityPost.create({
      data,
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
  }

  findPostInCommunity(postId: string, communityId: string) {
    return prisma.communityPost.findFirst({ where: { id: postId, communityId } });
  }

  async listComments(postId: string, skip: number, take: number) {
    const where = { postId };
    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take,
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
      }),
      prisma.comment.count({ where }),
    ]);
    return { items, total };
  }
}

export const communityRepository = new CommunityRepository();
