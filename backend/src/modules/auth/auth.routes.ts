import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../core/middleware/validate.middleware";
import { authenticate } from "../../core/middleware/auth.middleware";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
} from "./auth.validation";

const router = Router();

// 1. Đăng ký & Xác thực Email qua OTP
router.post("/register", validate(registerSchema), authController.register);
router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
router.post("/resend-otp", validate(resendOtpSchema), authController.resendOtp);

// 2. Quên mật khẩu & Đặt lại mật khẩu qua OTP
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

// 3. Đăng nhập truyền thống & Đăng nhập Google (Account Linking)
router.post("/login", validate(loginSchema), authController.login);
router.post("/google", validate(googleAuthSchema), authController.loginWithGoogle);

// 4. Các routes yêu cầu đăng nhập
router.get("/me", authenticate, authController.getMe);
router.post("/logout", authenticate, authController.logout);

export default router;
