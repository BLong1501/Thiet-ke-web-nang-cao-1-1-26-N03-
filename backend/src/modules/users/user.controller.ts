import { Request, Response, NextFunction } from "express";
import { userService, UserService } from "./user.service";
import { sendSuccess } from "../../core/utils/response.util";
import { auditService } from "../../core/services/audit.service";

export class UserController {
  constructor(private service: UserService = userService) {}

  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getUsersList(req.query as any);
      return sendSuccess(res, 200, "Lấy danh sách người dùng thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };

  getUserDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const user = await this.service.getUserDetail(id);
      return sendSuccess(res, 200, "Lấy chi tiết người dùng thành công", user);
    } catch (error) {
      return next(error);
    }
  };

  updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const adminId = req.user!.userId;
      const result = await this.service.updateUserStatus(id, req.body, adminId);
      return sendSuccess(res, 200, result.message, result.user);
    } catch (error) {
      return next(error);
    }
  };

  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await auditService.getLogs(req.query as any);
      return sendSuccess(res, 200, "Lấy danh sách nhật ký kiểm toán bảo mật thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };
}

export const userController = new UserController();
