import { z } from "zod";
import { UserRole, UserStatus } from "@prisma/client";

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "fullName", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
  reason: z.string().max(255).optional(),
});

export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
