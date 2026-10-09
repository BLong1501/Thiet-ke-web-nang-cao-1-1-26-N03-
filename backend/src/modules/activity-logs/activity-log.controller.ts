import { Request, Response } from "express";
import { activityLogService } from "./activity-log.service";
import { sendSuccess, sendError } from "../../core/utils/response.util";
import { AuditLogQueryInput } from "./activity-log.validation";

export class ActivityLogController {
  /**
   * GET /api/v1/activity-logs
   * Lấy danh sách toàn bộ nhật ký hệ thống (Admin)
   */
  getLogs = async (req: Request, res: Response) => {
    const query = req.query as unknown as AuditLogQueryInput;
    const result = await activityLogService.getLogs(query);
    return sendSuccess(res, result, "Lấy danh sách nhật ký hệ thống thành công");
  };

  /**
   * GET /api/v1/activity-logs/stats
   * Thống kê tổng hợp nhật ký theo hành động và thực thể
   */
  getStats = async (req: Request, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const result = await activityLogService.getStats(from, to);
    return sendSuccess(res, result, "Lấy thống kê nhật ký thành công");
  };

  /**
   * GET /api/v1/activity-logs/:id
   * Chi tiết một bản ghi nhật ký
   */
  getLogById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await activityLogService.getLogById(id);
    return sendSuccess(res, result, "Lấy chi tiết nhật ký thành công");
  };

  /**
   * GET /api/v1/activity-logs/user/:userId
   * Nhật ký hoạt động của một người dùng (Admin xem)
   */
  getUserLogs = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await activityLogService.getUserLogs(userId, page, limit);
    return sendSuccess(res, result, "Lấy nhật ký người dùng thành công");
  };
}

export const activityLogController = new ActivityLogController();
