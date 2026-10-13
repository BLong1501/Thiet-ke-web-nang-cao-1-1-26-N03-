import { z } from "zod";
import { ReportStatus, ReportTargetType } from "@prisma/client";
import { paginationQuerySchema } from "../../core/utils/pagination.util";

export const createReportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.string().trim().min(1).max(36),
  reason: z.string().trim().min(3).max(255),
  description: z.string().trim().max(2000).optional(),
  evidenceUrls: z.array(z.string().url().max(500)).max(10).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum([ReportStatus.RESOLVED, ReportStatus.REJECTED]).default(ReportStatus.RESOLVED),
  resolution: z.string().trim().min(5).max(2000),
});

export const reportQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ReportStatus).optional(),
  targetType: z.nativeEnum(ReportTargetType).optional(),
});

export const reportIdParamSchema = z.object({ id: z.string().min(1).max(36) });

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
