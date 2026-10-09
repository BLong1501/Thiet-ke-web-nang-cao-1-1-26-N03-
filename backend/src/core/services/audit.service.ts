import { prisma } from "../database/prisma";
import { Request } from "express";

export interface LogAuditOptions {
  userId?: string | null;
  action: string;
  entityName: string;
  entityId: string;
  details?: Record<string, any> | null;
  req?: Request;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Ghi nhận một hành vi nhạy cảm vào bảng audit_logs
   */
  async log(options: LogAuditOptions): Promise<void> {
    try {
      let ipAddress = options.ipAddress;
      let userAgent = options.userAgent;
      let userId = options.userId;

      if (options.req) {
        ipAddress =
          ipAddress ||
          (options.req.headers["x-forwarded-for"] as string) ||
          options.req.socket.remoteAddress ||
          "127.0.0.1";
        userAgent = userAgent || (options.req.headers["user-agent"] as string) || "Unknown";
        if (!userId && (options.req as any).user?.userId) {
          userId = (options.req as any).user.userId;
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action: options.action.substring(0, 100),
          entityName: options.entityName.substring(0, 50),
          entityId: String(options.entityId).substring(0, 36),
          details: options.details ? (options.details as any) : undefined,
          ipAddress: ipAddress ? String(ipAddress).substring(0, 45) : null,
          userAgent: userAgent ? String(userAgent).substring(0, 255) : null,
        },
      });
    } catch (error) {
      // Ghi log lỗi nội bộ để không làm gián đoạn luồng nghiệp vụ chính
      console.error("[AUDIT LOGGING FAILED]:", error);
    }
  }

  /**
   * Truy vấn danh sách Audit Logs dành cho Quản trị viên đối soát
   */
  async getLogs(query: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
    entityName?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action) where.action = { contains: query.action };
    if (query.userId) where.userId = query.userId;
    if (query.entityName) where.entityName = query.entityName;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const auditService = new AuditService();
