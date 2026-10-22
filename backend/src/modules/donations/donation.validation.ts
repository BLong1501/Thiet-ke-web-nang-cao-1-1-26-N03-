import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export const createDonationSchema = z.object({
  campaignId: z.string().min(1, "ID chiến dịch không được để trống"),
  amount: z
    .coerce
    .number()
    .int("Số tiền quyên góp phải là số nguyên")
    .positive("Số tiền quyên góp phải lớn hơn 0")
    .min(10000, "Số tiền quyên góp tối thiểu là 10.000 VNĐ")
    .max(1000000000, "Số tiền quyên góp tối đa là 1.000.000.000 VNĐ"),
  requestKey: z.string().trim().max(100).optional(),
  donorName: z.string().min(2, "Họ tên người ủng hộ tối thiểu 2 ký tự").max(150).optional(),
  donorEmail: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  donorPhone: z.string().regex(/^[0-9+]{9,15}$/, "Số điện thoại không hợp lệ").optional().or(z.literal("")),
  donorIdCard: z.string().trim().regex(/^[0-9]{9,12}$/, "Số CCCD/CMND phải gồm 9-12 chữ số").optional().or(z.literal("")),
  message: z.string().max(500, "Lời nhắn tối đa 500 ký tự").optional(),
  isAnonymous: z.boolean().optional().default(false),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
});

export const confirmDonationSchema = z.object({
  gatewayTransactionNo: z.string().optional(),
  paymentGatewayResponse: z.record(z.string(), z.any()).optional(),
  note: z.string().optional(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(3, "Lý do tối thiểu 3 ký tự").max(500, "Lý do tối đa 500 ký tự"),
});

export const requestRefundSchema = z.object({
  reason: z.string().trim().min(3, "Lý do tối thiểu 3 ký tự").max(500, "Lý do tối đa 500 ký tự"),
  idCardNumber: z.string().trim().regex(/^[0-9]{9,12}$/, "Số CCCD/CMND phải gồm 9-12 chữ số"),
  idCardName: z.string().trim().min(2, "Họ và tên trên CCCD không được để trống").max(100),
  bankName: z.string().trim().min(2, "Vui lòng chọn hoặc nhập tên ngân hàng thụ hưởng").max(100),
  bankAccountNumber: z.string().trim().min(3, "Số tài khoản nhận tiền hoàn không hợp lệ").max(50),
  bankAccountName: z.string().trim().min(2, "Tên chủ tài khoản nhận tiền hoàn tối thiểu 2 ký tự").max(100),
});

export const emptyActionSchema = z.object({}).passthrough();

export const donationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.nativeEnum(PaymentStatus).optional(),
  campaignId: z.string().min(1).optional(),
  sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
export type ConfirmDonationInput = z.infer<typeof confirmDonationSchema>;
export type ReasonInput = z.infer<typeof reasonSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
export type DonationQueryInput = z.infer<typeof donationQuerySchema>;
