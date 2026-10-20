import { safeActivity } from "../../core/services/activity-description";
import { prisma } from "../../core/database/prisma";
import { AppError } from "../../core/errors/app.error";
import { ActivityLogQueryInput, ActivityLogStatsQueryInput } from "./activity-log.validation";

export class ActivityLogService {
  /** Only an actor's own events; omit internal details and other identity data. */
  async getMyLogs(userId: string, query: ActivityLogQueryInput) {
    const result = await this.getUserLogs(userId, query);
    return {
      meta: result.meta,
      items: result.items.map(log => ({
        id: log.id,
        action: log.action,
        entityName: log.entityName,
        entityId: log.entityId,
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Lấy danh sách nhật ký hệ thống kèm bộ lọc, tìm kiếm và phân trang
   */
  async getLogs(query: ActivityLogQueryInput) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tìm kiếm đa trường (action, entityName, entityId, IP, tên/email user)
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { action: { contains: search } },
        { entityName: { contains: search } },
        { entityId: { contains: search } },
        { details: { path: "$.description", string_contains: search } },
        {
          user: {
            is: {
              OR: [
                { fullName: { contains: search } },
                { email: { contains: search } },
              ],
            },
          },
        },
      ];
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityName) {
      where.entityName = query.entityName;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    // Lọc theo khoảng thời gian
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map(safeActivity),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Thống kê tổng quan về nhật ký hệ thống (Audit KPI & Stats)
   */
  async getStats(query?: ActivityLogStatsQueryInput) {
    const where: any = {};

    if (query?.from || query?.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    // 1. Tổng số bản ghi
    const total = await prisma.auditLog.count({ where });

    // 2. Thống kê theo loại hành động
    const actionGroups = await prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 10,
    });

    // 3. Thống kê theo thực thể
    const entityGroups = await prisma.auditLog.groupBy({
      by: ["entityName"],
      where,
      _count: {
        entityName: true,
      },
      orderBy: {
        _count: {
          entityName: "desc",
        },
      },
      take: 10,
    });

    const byAction = actionGroups.map((g) => ({
      action: g.action,
      count: g._count.action,
    }));

    const byEntity = entityGroups.map((g) => ({
      entity: g.entityName,
      count: g._count.entityName,
    }));

    return {
      total,
      byAction,
      byEntity,
    };
  }

  /**
   * Lấy chi tiết một bản ghi Audit Log theo ID
   */
  async getLogById(id: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!log) {
      throw new AppError("Không tìm thấy bản ghi nhật ký hệ thống", 404);
    }

    return safeActivity(log);
  }

  /**
   * Lấy danh sách Audit Logs theo người dùng cụ thể
   */
  async getUserLogs(userId: string, query: ActivityLogQueryInput) {
    return this.getLogs({
      ...query,
      userId,
    });
  }

}

export const activityLogService = new ActivityLogService();
