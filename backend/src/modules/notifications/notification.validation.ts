import { z } from "zod";
import { paginationQuerySchema } from "../../core/utils/pagination.util";

export const notificationQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const notificationIdParamSchema = z.object({
  id: z.string().min(1).max(36),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
