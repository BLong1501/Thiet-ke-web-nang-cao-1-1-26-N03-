import { z } from "zod";

// A calendar day means the entire day in Vietnam, independent of server timezone.
const dateBound = (end: boolean) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const day = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const validDay =
        !day ||
        (!Number.isNaN(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value);
      const iso = day
        ? `${value}T${end ? "23:59:59.999" : "00:00:00.000"}+07:00`
        : value;
      if (
        !validDay ||
        (!day && !z.iso.datetime({ offset: true }).safeParse(value).success) ||
        Number.isNaN(Date.parse(iso))
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Ngày không hợp lệ; dùng YYYY-MM-DD hoặc ISO có múi giờ",
        });
        return z.NEVER;
      }
      return new Date(iso).toISOString();
    })
    .optional();
const range = { from: dateBound(false), to: dateBound(true) };
const orderedRange = (value: { from?: string; to?: string }) =>
  !value.from || !value.to || value.from <= value.to;
const query = z.object({
  page: z.coerce.number().int().positive().max(1000000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(200).optional(),
  action: z.string().trim().max(100).optional(),
  entityName: z.string().trim().max(50).optional(),
  userId: z.string().uuid().optional(),
  ...range,
});
const rangeError = {
  message: "Từ ngày phải trước hoặc bằng đến ngày",
  path: ["to"],
};
export const activityLogQuerySchema = query.refine(orderedRange, rangeError);
export const personalActivityLogQuerySchema = query
  .omit({ userId: true })
  .refine(orderedRange, rangeError);
export const activityLogStatsQuerySchema = z
  .object(range)
  .refine(orderedRange, rangeError);
export const activityLogIdSchema = z.object({ id: z.string().uuid() });
export const activityLogUserSchema = z.object({ userId: z.string().uuid() });
export type ActivityLogQueryInput = z.infer<typeof activityLogQuerySchema>;
export type ActivityLogStatsQueryInput = z.infer<
  typeof activityLogStatsQuerySchema
>;
