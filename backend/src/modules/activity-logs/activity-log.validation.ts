import { z } from "zod";

export const activityLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  action: z.string().trim().optional(),
  entityName: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "action", "entityName"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const activityLogStatsQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

export const createActivityLogSchema = z.object({
  action: z.string().min(1, "Hành động là bắt buộc").max(100),
  entityName: z.string().min(1, "Tên thực thể là bắt buộc").max(50),
  entityId: z.string().min(1, "ID thực thể là bắt buộc").max(36),
  details: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().max(255).optional(),
});

export type ActivityLogQueryInput = z.infer<typeof activityLogQuerySchema>;
export type ActivityLogStatsQueryInput = z.infer<typeof activityLogStatsQuerySchema>;
export type CreateActivityLogInput = z.infer<typeof createActivityLogSchema>;
