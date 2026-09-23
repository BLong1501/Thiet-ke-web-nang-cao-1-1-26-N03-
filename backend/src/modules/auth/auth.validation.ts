import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Định dạng email không hợp lệ")
    .max(255, "Email tối đa 255 ký tự"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có độ dài tối thiểu 6 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự"),
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có tối thiểu 2 ký tự")
    .max(150, "Họ và tên tối đa 150 ký tự"),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, "Số điện thoại Việt Nam không hợp lệ")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Định dạng email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});

export const verifyEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Định dạng email không hợp lệ"),
  otp: z
    .string()
    .trim()
    .length(6, "Mã OTP phải đúng 6 chữ số")
    .regex(/^[0-9]+$/, "Mã OTP chỉ bao gồm các chữ số"),
});

export const resendOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Định dạng email không hợp lệ"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Định dạng email không hợp lệ"),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Định dạng email không hợp lệ"),
  otp: z
    .string()
    .trim()
    .length(6, "Mã OTP phải đúng 6 chữ số")
    .regex(/^[0-9]+$/, "Mã OTP chỉ bao gồm các chữ số"),
  newPassword: z
    .string()
    .min(6, "Mật khẩu mới phải có tối thiểu 6 ký tự")
    .max(100, "Mật khẩu mới tối đa 100 ký tự"),
});

export const googleAuthSchema = z.object({
  idToken: z
    .string()
    .trim()
    .min(10, "Google ID Token không hợp lệ"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
