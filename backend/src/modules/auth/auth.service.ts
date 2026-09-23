import bcrypt from "bcrypt";
import crypto from "crypto";
import { UserStatus, AuthProvider } from "@prisma/client";
import { authRepository, AuthRepository } from "./auth.repository";
import {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./auth.validation";
import { generateAccessToken, generateRefreshToken } from "../../core/utils/jwt.util";
import { redisService } from "../../core/database/redis";
import { mailService } from "../../core/services/mail.service";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  constructor(private repo: AuthRepository = authRepository) {}

  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async register(input: RegisterInput) {
    // 1. Kiểm tra trùng email
    const existingEmail = await this.repo.findByEmail(input.email);
    if (existingEmail) {
      const error: any = new Error("Địa chỉ email này đã được sử dụng bởi một tài khoản khác");
      error.statusCode = 409;
      throw error;
    }

    // 2. Kiểm tra trùng số điện thoại (nếu có cung cấp)
    if (input.phoneNumber) {
      const existingPhone = await this.repo.findByPhoneNumber(input.phoneNumber);
      if (existingPhone) {
        const error: any = new Error("Số điện thoại này đã được liên kết với một tài khoản khác");
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Băm mật khẩu (chuẩn OWASP)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    // 4. Sinh mã OTP 6 số ngẫu nhiên
    const otp = this.generateOTP();

    // 5. Lưu tạm toàn bộ thông tin đăng ký vào Redis (TTL: 10 phút) - CHƯA LƯU VÀO DB
    await redisService.setPendingRegistration(
      input.email,
      {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phoneNumber: input.phoneNumber || null,
        otp,
      },
      600
    );

    // 6. Gửi email xác thực kèm mã OTP
    await mailService.sendVerificationEmail(input.email, input.fullName, otp);

    return {
      message: "Đăng ký thành công! Vui lòng kiểm tra email để nhập mã OTP xác thực và kích hoạt tài khoản trong vòng 10 phút.",
    };
  }

  async verifyEmail(input: VerifyEmailInput) {
    // 1. Kiểm tra xem tài khoản đã tồn tại và đã kích hoạt trong DB chưa
    const existingUser = await this.repo.findByEmail(input.email);
    if (existingUser && existingUser.isEmailVerified) {
      const tokenPayload = { userId: existingUser.id, email: existingUser.email, role: existingUser.role };
      const { passwordHash: _, ...safeUser } = existingUser;
      return {
        message: "Tài khoản của bạn đã được xác thực từ trước. Đăng nhập thành công!",
        user: safeUser,
        accessToken: generateAccessToken(tokenPayload),
        refreshToken: generateRefreshToken(tokenPayload),
      };
    }

    // 2. Lấy thông tin đăng ký tạm từ Redis
    const pending = await redisService.getPendingRegistration(input.email);
    if (!pending) {
      const error: any = new Error(
        "Yêu cầu đăng ký đã hết hạn (quá 10 phút) hoặc không tồn tại. Vui lòng thực hiện đăng ký lại từ đầu."
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Đối soát mã OTP
    const cleanOtp = input.otp.trim();
    if (pending.otp !== cleanOtp) {
      const error: any = new Error("Mã OTP không chính xác. Vui lòng kiểm tra lại.");
      error.statusCode = 400;
      throw error;
    }

    // 4. CHÍNH THỨC TẠO TÀI KHOẢN VÀO MYSQL DATABASE VỚI isEmailVerified = true
    const newUser = await this.repo.createUser({
      email: pending.email,
      passwordHash: pending.passwordHash,
      fullName: pending.fullName,
      phoneNumber: pending.phoneNumber,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    // 5. Xóa thông tin đăng ký tạm khỏi Redis
    await redisService.deletePendingRegistration(input.email);

    // 6. Cấp phát Token đăng nhập
    const tokenPayload = { userId: newUser.id, email: newUser.email, role: newUser.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { passwordHash: _, ...safeUser } = newUser;

    return {
      message: "Xác thực email thành công! Tài khoản của bạn đã được tạo và kích hoạt.",
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async resendVerificationOtp(input: ResendOtpInput) {
    const existingUser = await this.repo.findByEmail(input.email);
    if (existingUser && existingUser.isEmailVerified) {
      const error: any = new Error("Tài khoản này đã được kích hoạt từ trước");
      error.statusCode = 400;
      throw error;
    }

    const pending = await redisService.getPendingRegistration(input.email);
    if (!pending) {
      const error: any = new Error(
        "Yêu cầu đăng ký đã hết hạn (quá 10 phút). Vui lòng thực hiện đăng ký lại từ đầu."
      );
      error.statusCode = 400;
      throw error;
    }

    const otp = this.generateOTP();
    pending.otp = otp;
    await redisService.setPendingRegistration(input.email, pending, 600);
    await mailService.sendVerificationEmail(input.email, pending.fullName, otp);

    return {
      message: "Mã OTP mới đã được gửi về hòm thư của bạn. Vui lòng kiểm tra email (hiệu lực 10 phút).",
    };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      const error: any = new Error("Không tìm thấy tài khoản với địa chỉ email này");
      error.statusCode = 404;
      throw error;
    }

    const otp = this.generateOTP();
    await redisService.setOTP(`password_reset:${user.email}`, otp, 600);
    await mailService.sendPasswordResetEmail(user.email, user.fullName, otp);

    return {
      message: "Mã xác thực đặt lại mật khẩu đã được gửi đến email của bạn.",
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      const error: any = new Error("Không tìm thấy tài khoản với địa chỉ email này");
      error.statusCode = 404;
      throw error;
    }

    const savedOtp = await redisService.getOTP(`password_reset:${input.email}`);
    if (!savedOtp || savedOtp !== input.otp) {
      const error: any = new Error("Mã OTP không chính xác hoặc đã hết hiệu lực");
      error.statusCode = 400;
      throw error;
    }

    await redisService.deleteOTP(`password_reset:${input.email}`);

    // Băm mật khẩu mới
    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await this.repo.updatePassword(user.id, passwordHash);

    return {
      message: "Đặt lại mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập.",
    };
  }

  async login(input: LoginInput) {
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      const error: any = new Error("Email hoặc mật khẩu không chính xác");
      error.statusCode = 401;
      throw error;
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
      const error: any = new Error(
        `Tài khoản của bạn đã bị ${user.status === UserStatus.BANNED ? "cấm" : "tạm khóa"}. Vui lòng liên hệ ban quản trị để biết thêm chi tiết`
      );
      error.statusCode = 403;
      throw error;
    }

    if (user.authProvider === AuthProvider.GOOGLE && !user.passwordHash) {
      const error: any = new Error(
        "Tài khoản này được đăng ký thông qua Google. Vui lòng bấm 'Đăng nhập bằng Google' hoặc dùng tính năng Quên mật khẩu để tạo mật khẩu riêng."
      );
      error.statusCode = 400;
      throw error;
    }

    if (!user.passwordHash) {
      const error: any = new Error("Tài khoản chưa có mật khẩu.");
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      const error: any = new Error("Email hoặc mật khẩu không chính xác");
      error.statusCode = 401;
      throw error;
    }

    // Bắt buộc xác thực email
    if (!user.isEmailVerified) {
      const error: any = new Error("Tài khoản của bạn chưa được xác thực email. Vui lòng hoàn tất xác thực OTP.");
      error.statusCode = 403;
      error.isEmailNotVerified = true;
      throw error;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { passwordHash: _, ...safeUser } = user;

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async loginWithGoogle(idToken: string) {
    let googleUser: { googleId: string; email: string; fullName: string; avatarUrl?: string };

    // Hỗ trợ Mock Token cho môi trường Development
    if (idToken.startsWith("mock_google_token_")) {
      const mockEmail = idToken.replace("mock_google_token_", "") + "@gmail.com";
      googleUser = {
        googleId: "google_sub_" + Buffer.from(mockEmail).toString("hex"),
        email: mockEmail,
        fullName: "Google User " + mockEmail.split("@")[0],
        avatarUrl: "https://lh3.googleusercontent.com/a/default-user",
      };
    } else {
      try {
        // Xác minh Google ID Token chính thức
        if (process.env.GOOGLE_CLIENT_ID) {
          const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          if (!payload || !payload.email) {
            throw new Error("Không lấy được thông tin email từ Google");
          }
          googleUser = {
            googleId: payload.sub,
            email: payload.email,
            fullName: payload.name || "Người dùng Google",
            avatarUrl: payload.picture,
          };
        } else {
          // Fallback verify qua Google tokeninfo endpoint
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
          if (!res.ok) {
            throw new Error("Token Google không hợp lệ hoặc đã hết hạn");
          }
          const data: any = await res.json();
          googleUser = {
            googleId: data.sub,
            email: data.email,
            fullName: data.name || "Người dùng Google",
            avatarUrl: data.picture,
          };
        }
      } catch (err: any) {
        const error: any = new Error("Xác thực Google ID Token thất bại: " + err.message);
        error.statusCode = 401;
        throw error;
      }
    }

    // Cơ chế Account Linking: Kiểm tra email đã có trong hệ thống chưa
    let user = await this.repo.findByEmail(googleUser.email);

    if (user) {
      // Email ĐÃ TỒN TẠI -> Hợp nhất tài khoản về cùng 1 ID duy nhất!
      if (!user.googleId) {
        user = await this.repo.linkGoogleAccount(user.id, googleUser.googleId, googleUser.avatarUrl);
      }
    } else {
      // Email CHƯA TỒN TẠI -> Tạo mới tài khoản với Google
      user = await this.repo.createUser({
        email: googleUser.email,
        fullName: googleUser.fullName,
        googleId: googleUser.googleId,
        avatarUrl: googleUser.avatarUrl,
        authProvider: AuthProvider.GOOGLE,
        isEmailVerified: true, // Google email mặc định đã được Google xác thực
        emailVerifiedAt: new Date(),
      });
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
      const error: any = new Error(
        `Tài khoản của bạn đã bị ${user.status === UserStatus.BANNED ? "cấm" : "tạm khóa"}. Vui lòng liên hệ ban quản trị.`
      );
      error.statusCode = 403;
      throw error;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { passwordHash: _, ...safeUser } = user;

    return {
      message: "Đăng nhập bằng tài khoản Google thành công!",
      user: safeUser,
      accessToken,
      refreshToken,
      isProfileComplete: Boolean(user.phoneNumber), // Báo hiệu cho frontend nếu user chưa bổ sung SĐT
    };
  }

  async getProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) {
      const error: any = new Error("Không tìm thấy thông tin tài khoản");
      error.statusCode = 404;
      throw error;
    }
    return user;
  }
}

export const authService = new AuthService();
