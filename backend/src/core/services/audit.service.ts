import { activityLogService } from "../../modules/activity-logs/activity-log.service";
import { activityLogQuerySchema } from "../../modules/activity-logs/activity-log.validation";
import { Prisma } from "@prisma/client";
import { activityDescription } from "./activity-description";
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
  /** Transaction callers must propagate errors so a rolled-back operation has no log. */
  async write(
    options: LogAuditOptions,
    client: Pick<Prisma.TransactionClient, "auditLog"> = prisma,
  ) {
    return client.auditLog.create({
      data: {
        userId: options.req?.user?.userId ?? options.userId ?? null,
        action: options.action.slice(0, 100),
        entityName: options.entityName.slice(0, 50),
        entityId: String(options.entityId).slice(0, 36),
        // Deliberate allowlist: never persist request bodies, free text or payment data.
        details: { description: activityDescription(options.action) },
      },
    });
  }

  /** Await after a successful service call; logging failure does not change its result. */
  async log(options: LogAuditOptions): Promise<void> {
    try {
      await this.write(options);
    } catch {
      console.error("[AUDIT LOGGING FAILED] Could not persist activity event");
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
    return activityLogService.getLogs(activityLogQuerySchema.parse(query));
  }
}

export const auditService = new AuditService();
