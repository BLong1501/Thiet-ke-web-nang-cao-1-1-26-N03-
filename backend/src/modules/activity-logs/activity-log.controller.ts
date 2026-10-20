import { Request, Response, NextFunction } from "express";
import { activityLogService, ActivityLogService } from "./activity-log.service";
import { sendSuccess } from "../../core/utils/response.util";

export class ActivityLogController {
  constructor(private service: ActivityLogService = activityLogService) {}

  getMyLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getMyLogs(req.user!.userId, req.query as any);
      return sendSuccess(res, 200, "Lấy nhật ký cá nhân thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lấy danh sách nhật ký hệ thống
   * GET /api/v1/activity-logs
   */
  getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getLogs(req.query as any);
      return sendSuccess(
        res,
        200,
        "Lấy danh sách nhật ký hệ thống thành công",
        { items: result.items, meta: result.meta },
        result.meta
      );
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lấy thống kê số liệu nhật ký hệ thống
   * GET /api/v1/activity-logs/stats
   */
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getStats(req.query as any);
      return sendSuccess(res, 200, "Lấy thống kê nhật ký hệ thống thành công", stats);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lấy chi tiết một bản ghi nhật ký
   * GET /api/v1/activity-logs/:id
   */
  getLogById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const log = await this.service.getLogById(id);
      return sendSuccess(res, 200, "Lấy chi tiết nhật ký thành công", log);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lấy danh sách nhật ký của người dùng cụ thể
   * GET /api/v1/activity-logs/user/:userId
   */
  getUserLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = String(req.params.userId);
      const result = await this.service.getUserLogs(userId, req.query as any);
      return sendSuccess(
        res,
        200,
        "Lấy danh sách nhật ký của người dùng thành công",
        { items: result.items, meta: result.meta },
        result.meta
      );
    } catch (error) {
      return next(error);
    }
  };

}

export const activityLogController = new ActivityLogController();
