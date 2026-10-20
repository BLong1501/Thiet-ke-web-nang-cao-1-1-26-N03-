import { Request, Response, NextFunction } from "express";
import { communityService, CommunityService } from "./community.service";
import { sendSuccess } from "../../core/utils/response.util";
import { auditService } from "../../core/services/audit.service";
import type { PaginationQuery } from "../../core/utils/pagination.util";

const q = (req: Request) => req.query as unknown as PaginationQuery;
const param = (req: Request, name: string) => String(req.params[name]);

export class CommunityController {
  constructor(private service: CommunityService = communityService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = await this.service.list(q(req), req.user?.userId);
      return sendSuccess(res, 200, "Lấy danh sách cộng đồng thành công", r.items, r.meta);
    } catch (e) {
      return next(e);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const community = await this.service.create(req.user!.userId, req.body);
      await auditService.log({
        req,
        action: "COMMUNITY_CREATED",
        entityName: "Community",
        entityId: community.id,
        details: { name: community.name },
      });
      return sendSuccess(res, 201, "Tạo cộng đồng thành công", community);
    } catch (e) {
      return next(e);
    }
  };

  join = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.toggleJoin(req.user!.userId, param(req, "id"));
      await auditService.log({ req, action: "UPDATE_MEMBERSHIP", entityName: "Community", entityId: param(req, "id") });
      return sendSuccess(res, 200, "Đã cập nhật tư cách thành viên", data);
    } catch (e) {
      return next(e);
    }
  };

  listPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = await this.service.listPosts(param(req, "id"), q(req), req.user?.userId);
      return sendSuccess(res, 200, "Lấy danh sách bài viết thành công", r.items, r.meta);
    } catch (e) {
      return next(e);
    }
  };

  createPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await this.service.createPost(req.user!.userId, param(req, "id"), req.body);
      await auditService.log({ req, action: "CREATE_POST", entityName: "Post", entityId: post.id });
      return sendSuccess(res, 201, "Đăng bài thành công", post);
    } catch (e) {
      return next(e);
    }
  };

  toggleLike = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.toggleLike(
        req.user!.userId,
        param(req, "id"),
        param(req, "postId"),
      );
      return sendSuccess(res, 200, "Đã cập nhật lượt thích", data);
    } catch (e) {
      return next(e);
    }
  };

  listComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = await this.service.listComments(
        param(req, "id"),
        param(req, "postId"),
        q(req),
        req.user?.userId,
      );
      return sendSuccess(res, 200, "Lấy danh sách bình luận thành công", r.items, r.meta);
    } catch (e) {
      return next(e);
    }
  };

  createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const c = await this.service.createComment(
        req.user!.userId,
        param(req, "id"),
        param(req, "postId"),
        req.body,
      );
      await auditService.log({ req, action: "CREATE_COMMENT", entityName: "Comment", entityId: c.id });
      return sendSuccess(res, 201, "Đã gửi bình luận", c);
    } catch (e) {
      return next(e);
    }
  };
}

export const communityController = new CommunityController();
