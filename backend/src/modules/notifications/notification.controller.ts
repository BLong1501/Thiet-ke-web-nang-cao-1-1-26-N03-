import { Request, Response, NextFunction } from "express";
import { notificationService, NotificationService } from "./notification.service";
import { sendSuccess } from "../../core/utils/response.util";
import type { NotificationQueryInput } from "./notification.validation";

export class NotificationController {
  constructor(private service: NotificationService = notificationService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.list(
        req.user!.userId,
        req.query as unknown as NotificationQueryInput,
      );
      return sendSuccess(res, 200, "Lấy danh sách thông báo thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };

  unreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.unreadCount(req.user!.userId);
      return sendSuccess(res, 200, "Số thông báo chưa đọc", data);
    } catch (error) {
      return next(error);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.markRead(req.user!.userId, String(req.params.id));
      return sendSuccess(res, 200, "Đã đánh dấu đã đọc", data);
    } catch (error) {
      return next(error);
    }
  };

  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.markAllRead(req.user!.userId);
      return sendSuccess(res, 200, "Đã đánh dấu tất cả đã đọc", data);
    } catch (error) {
      return next(error);
    }
  };
}

export const notificationController = new NotificationController();
