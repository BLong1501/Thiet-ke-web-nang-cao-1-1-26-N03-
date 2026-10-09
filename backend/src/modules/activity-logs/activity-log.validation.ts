import { z } from "zod";

/**
 * Schema truy vấn nhật ký hệ thống (Admin)
 */
export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().trim().max(36).optional(),
  action: z.string().trim().max(100).optional(),
  entityName: z.string().trim().max(50).optional(),
  entityId: z.string().trim().max(36).optional(),
  search: z.string().trim().max(100).optional(),
  from: z.string().datetime({ message: "Ngày bắt đầu không đúng định dạng ISO" }).optional(),
  to: z.string().datetime({ message: "Ngày kết thúc không đúng định dạng ISO" }).optional(),
  sortBy: z.enum(["newest", "oldest"]).default("newest"),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
