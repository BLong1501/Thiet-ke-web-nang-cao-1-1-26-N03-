import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có tối thiểu 2 ký tự")
    .max(150, "Họ và tên tối đa 150 ký tự")
    .optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, "Số điện thoại Việt Nam không hợp lệ")
    .optional()
    .or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .url("Đường dẫn ảnh đại diện không hợp lệ")
    .max(500, "Đường dẫn ảnh quá dài")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .trim()
    .max(500, "Tiểu sử tối đa 500 ký tự")
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(6, "Mật khẩu mới phải có tối thiểu 6 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
