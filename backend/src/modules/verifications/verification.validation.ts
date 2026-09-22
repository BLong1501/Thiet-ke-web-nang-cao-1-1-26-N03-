import { z } from "zod";
import { VerificationStatus } from "@prisma/client";

export const submitVerificationSchema = z.object({
  idCardNumber: z
    .string()
    .trim()
    .min(9, "Số CCCD/CMND phải có tối thiểu 9 số")
    .max(20, "Số CCCD/CMND tối đa 20 số")
    .regex(/^[0-9]+$/, "Số CCCD/CMND chỉ được chứa các ký số"),
  cardIssuedDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày cấp phải là YYYY-MM-DD"))
    .optional(),
  cardIssuedPlace: z
    .string()
    .trim()
    .max(200, "Nơi cấp tối đa 200 ký tự")
    .optional()
    .or(z.literal("")),
  frontCardImage: z
    .string()
    .trim()
    .url("Link ảnh mặt trước CCCD không hợp lệ")
    .max(500, "Đường dẫn ảnh quá dài"),
  backCardImage: z
    .string()
    .trim()
    .url("Link ảnh mặt sau CCCD không hợp lệ")
    .max(500, "Đường dẫn ảnh quá dài"),
  portraitImage: z
    .string()
    .trim()
    .url("Link ảnh chân dung cầm CCCD không hợp lệ")
    .max(500, "Đường dẫn ảnh quá dài"),
  supportingDocuments: z.any().optional(),
});

export const reviewVerificationSchema = z
  .object({
    status: z.nativeEnum(VerificationStatus, {
      message: "Trạng thái xét duyệt phải là APPROVED hoặc REJECTED",
    }),
    rejectionReason: z.string().trim().max(1000, "Lý do từ chối tối đa 1000 ký tự").optional(),
  })
  .refine(
    (data) => {
      if (data.status === VerificationStatus.REJECTED && (!data.rejectionReason || data.rejectionReason.length < 5)) {
        return false;
      }
      return true;
    },
    {
      message: "Khi từ chối hồ sơ, bạn bắt buộc phải nhập lý do từ chối (tối thiểu 5 ký tự)",
      path: ["rejectionReason"],
    }
  );

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;
