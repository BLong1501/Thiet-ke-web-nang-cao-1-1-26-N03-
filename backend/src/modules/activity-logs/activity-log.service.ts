import { Prisma } from "@prisma/client";
import { activityLogRepository, ActivityLogRepository } from "./activity-log.repository";
import { AuditLogQueryInput } from "./activity-log.validation";
import { AppError } from "../../core/errors/app.error";

export class ActivityLogService {
  constructor(private repo: ActivityLogRepository = activityLogRepository) {}

  /**
   * Lấy danh sách nhật ký hệ thống (Admin) có tìm kiếm, lọc, phân trang
   */
  async getLogs(query: AuditLogQueryInput) {
    const { page, limit, userId, action, entityName, entityId, search, from, to, sortBy } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    // Lọc theo người thực hiện
    if (userId) where.userId = userId;

    // Lọc theo loại hành động
    if (action) where.action = { contains: action };

    // Lọc theo tên thực thể
    if (entityName) where.entityName = entityName;

    // Lọc theo ID thực thể cụ thể
    if (entityId) where.entityId = entityId;

    // Tìm kiếm full-text qua action hoặc entityName
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { entityName: { contains: search } },
        { user: { fullName: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    // Lọc theo khoảng thời gian
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to);
    }

    const orderBy: Prisma.AuditLogOrderByWithRelationInput =
      sortBy === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

    const [items, total] = await Promise.all([
      this.repo.findLogs(where, orderBy, skip, limit),
      this.repo.countLogs(where),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((log) => ({
        id: log.id,
        action: log.action,
        entityName: log.entityName,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
        user: log.user
          ? {
              id: log.user.id,
              fullName: log.user.fullName,
              email: log.user.email,
              role: log.user.role,
              avatarUrl: log.user.avatarUrl,
            }
          : null,
      })),
      meta: { page, limit, total, totalPages },
    };
  }

  /**
   * Chi tiết một nhật ký
   */
  async getLogById(id: string) {
    const log = await this.repo.findById(id);
    if (!log) throw new AppError("Bản ghi nhật ký không tồn tại", 404);
    return log;
  }

  /**
   * Lấy thống kê tổng hợp nhật ký hệ thống
   */
  async getStats(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.repo.getActionStats(fromDate, toDate);
  }

  /**
   * Nhật ký hoạt động của một người dùng cụ thể (Admin xem)
   */
  async getUserLogs(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.repo.findByUserId(userId, skip, limit),
      this.repo.countLogs({ userId }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const activityLogService = new ActivityLogService();
