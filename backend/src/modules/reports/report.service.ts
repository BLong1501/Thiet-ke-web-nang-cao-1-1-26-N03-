import { Report } from "@prisma/client";
import { AppError } from "../../core/errors/app.error";
import { pageMeta, skipOf } from "../../core/utils/pagination.util";
import { notificationService } from "../notifications/notification.service";
import { reportRepository, ReportRepository } from "./report.repository";
import type {
  CreateReportInput,
  ReportQueryInput,
  ResolveReportInput,
} from "./report.validation";

const toDto = (r: Report & { reporter?: { id: string; fullName: string; email: string } }) => ({
  id: r.id,
  targetType: r.targetType,
  targetId: r.targetId,
  reason: r.reason,
  description: r.description,
  status: r.status,
  resolution: r.resolutionNote,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  ...(r.reporter ? { reporter: r.reporter } : {}),
});

export class ReportService {
  constructor(private repo: ReportRepository = reportRepository) {}

  async create(reporterId: string, input: CreateReportInput) {
    if (!(await this.repo.targetExists(input.targetType, input.targetId))) {
      throw new AppError("Đối tượng bị báo cáo không tồn tại", 404);
    }
    if (input.targetType === "USER" && input.targetId === reporterId) {
      throw new AppError("Bạn không thể tự báo cáo chính mình", 400);
    }
    if (await this.repo.findPendingDuplicate(reporterId, input.targetType, input.targetId)) {
      throw new AppError("Bạn đã gửi báo cáo cho đối tượng này và đang chờ xử lý", 409);
    }
    const report = await this.repo.create({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description || null,
      evidenceUrls: input.evidenceUrls,
    });
    return toDto(report);
  }

  async list(query: ReportQueryInput) {
    const { items, total } = await this.repo.list(
      {
        ...(query.status ? { status: query.status } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
      },
      skipOf(query.page, query.limit),
      query.limit,
    );
    return {
      items: items.map(toDto),
      meta: pageMeta(query.page, query.limit, total),
    };
  }

  async resolve(adminId: string, id: string, input: ResolveReportInput) {
    const updated = await this.repo.resolveIfPending(id, {
      status: input.status,
      resolvedBy: adminId,
      resolutionNote: input.resolution,
    });
    if (!updated) {
      const existing = await this.repo.findById(id);
      if (!existing) throw new AppError("Không tìm thấy báo cáo", 404);
      throw new AppError("Báo cáo này đã được xử lý trước đó", 409);
    }

    const report = (await this.repo.findById(id))!;
    // Thông báo kết quả cho người báo cáo; lỗi gửi thông báo không làm hỏng việc xử lý.
    await notificationService
      .notify({
        userId: report.reporterId,
        title: "Báo cáo của bạn đã được xử lý",
        message: `Kết quả: ${input.resolution}`,
        type: "REPORT_RESOLVED",
      })
      .catch((e) => console.error("[REPORT NOTIFY FAILED]:", e));
    return toDto(report);
  }
}

export const reportService = new ReportService();
