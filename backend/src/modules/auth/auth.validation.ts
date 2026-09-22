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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
