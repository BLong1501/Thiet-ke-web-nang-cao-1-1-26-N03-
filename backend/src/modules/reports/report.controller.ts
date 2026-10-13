import { Request, Response, NextFunction } from "express";
import { reportService, ReportService } from "./report.service";
import { sendSuccess } from "../../core/utils/response.util";
import { auditService } from "../../core/services/audit.service";
import type { ReportQueryInput } from "./report.validation";

export class ReportController {
  constructor(private service: ReportService = reportService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await this.service.create(req.user!.userId, req.body);
      await auditService.log({
        req,
        action: "REPORT_SUBMITTED",
        entityName: "Report",
        entityId: report.id,
        details: { targetType: report.targetType, targetId: report.targetId },
      });
      return sendSuccess(res, 201, "Đã gửi báo cáo đến quản trị viên", report);
    } catch (error) {
      return next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.list(req.query as unknown as ReportQueryInput);
      return sendSuccess(res, 200, "Lấy danh sách báo cáo thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };

  resolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const report = await this.service.resolve(req.user!.userId, id, req.body);
      await auditService.log({
        req,
        action: "REPORT_RESOLVED",
        entityName: "Report",
        entityId: id,
        details: { status: report.status },
      });
      return sendSuccess(res, 200, "Đã xử lý báo cáo", report);
    } catch (error) {
      return next(error);
    }
  };
}

export const reportController = new ReportController();
