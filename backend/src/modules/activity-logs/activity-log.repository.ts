import { prisma } from "../../core/database/prisma";
import { Prisma } from "@prisma/client";

export class ActivityLogRepository {
  /**
   * Tìm danh sách audit log có lọc, phân trang, tìm kiếm
   */
  async findLogs(
    where: Prisma.AuditLogWhereInput,
    orderBy: Prisma.AuditLogOrderByWithRelationInput,
    skip: number,
    take: number
  ) {
    return prisma.auditLog.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Đếm tổng số bản ghi log thỏa điều kiện
   */
  async countLogs(where: Prisma.AuditLogWhereInput): Promise<number> {
    return prisma.auditLog.count({ where });
  }

  /**
   * Lấy chi tiết một audit log theo ID
   */
  async findById(id: string) {
    return prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Lấy nhật ký hoạt động của một user cụ thể
   */
  async findByUserId(
    userId: string,
    skip: number,
    take: number
  ) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  /**
   * Lấy thống kê tổng hợp nhật ký theo hành động
   */
  async getActionStats(from?: Date, to?: Date) {
    const where: Prisma.AuditLogWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as any).gte = from;
      if (to) (where.createdAt as any).lte = to;
    }

    // Đếm tổng số log
    const total = await prisma.auditLog.count({ where });

    // Đếm theo từng action
    const grouped = await prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
      take: 10,
    });

    // Đếm theo entity
    const byEntity = await prisma.auditLog.groupBy({
      by: ["entityName"],
      where,
      _count: { entityName: true },
      orderBy: { _count: { entityName: "desc" } },
    });

    return {
      total,
      byAction: grouped.map((g) => ({
        action: g.action,
        count: g._count.action,
      })),
      byEntity: byEntity.map((e) => ({
        entity: e.entityName,
        count: e._count.entityName,
      })),
    };
  }

  /**
   * Ghi một bản ghi audit log mới
   */
  async create(data: {
    userId?: string;
    action: string;
    entityName: string;
    entityId: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityName: data.entityName,
        entityId: data.entityId,
        details: data.details as Prisma.InputJsonValue | undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}

export const activityLogRepository = new ActivityLogRepository();
