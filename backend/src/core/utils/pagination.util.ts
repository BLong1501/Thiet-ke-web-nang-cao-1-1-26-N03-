import { z } from "zod";

/** Schema query phân trang dùng chung cho các module mới. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function skipOf(page: number, limit: number): number {
  return (page - 1) * limit;
}
