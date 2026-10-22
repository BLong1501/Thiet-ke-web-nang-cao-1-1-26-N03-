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
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../core/utils/jwt.util";
import { redisService } from "../../core/database/redis";
import { mailService } from "../../core/services/mail.service";
import { auditService } from "../../core/services/audit.service";
import { prisma } from "../../core/database/prisma";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  constructor(private repo: AuthRepository = authRepository) {}

  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async register(input: RegisterInput) {
    // 0. Tự động dọn dẹp các tài khoản chưa xác thực email quá thời hạn 10 phút khỏi DB
    await prisma.user.deleteMany({
      where: {
        isEmailVerified: false,
        createdAt: { lte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    }).catch(() => {});

    // 1. Kiểm tra tài khoản đã tồn tại với email này chưa
    const existingEmail = await this.repo.findByEmail(input.email);
    if (existingEmail) {
      if (existingEmail.isEmailVerified) {
        // Tài khoản đã xác thực hoàn tất -> Không cho phép đăng ký đè
        const error: any = new Error("Địa chỉ email này đã được sử dụng bởi một tài khoản khác");
        error.statusCode = 409;
        throw error;
      }

      // Tài khoản trong DB nhưng CHƯA xác thực email (isEmailVerified = false):
      // Tự động xóa tài khoản chưa xác thực cũ khỏi DB để cho phép tạo mới hoàn toàn với email này!
      console.log(`🧹 Tự động xóa tài khoản chưa xác thực cũ (${input.email}) khỏi CSDL để tạo lại.`);
      await this.repo.deleteUser(existingEmail.id);
      await redisService.deletePendingRegistration(input.email);
    }

    // 2. Kiểm tra trùng số điện thoại (nếu có cung cấp)
    if (input.phoneNumber) {
      const existingPhone = await this.repo.findByPhoneNumber(input.phoneNumber);
      if (existingPhone) {
        if (existingPhone.isEmailVerified) {
          const error: any = new Error("Số điện thoại này đã được liên kết với một tài khoản khác");
          error.statusCode = 409;
          throw error;
        }
        await this.repo.deleteUser(existingPhone.id);
        await redisService.deletePendingRegistration(existingPhone.email);
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
        idCardNumber: input.idCardNumber || null,
        otp,
      },
      600
    );

    // 6. Gửi email xác thực kèm mã OTP
    await mailService.sendVerificationEmail(input.email, input.fullName, otp);

    return {
      message: "Đăng ký thành công! Vui lòng kiểm tra email để nhập mã OTP xác thực và kích hoạt tài khoản trong vòng 10 phút.",
      otp,
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
    const pending = (await redisService.getPendingRegistration(input.email)) as any;
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

    // 4.1. Tự động kiểm tra và liên kết các khoản đóng góp của khách vãng lai trước đây vào tài khoản mới
    try {
      const guestConditions: any[] = [];
      if (newUser.email) {
        guestConditions.push({ donorEmail: newUser.email });
      }
      if (pending.idCardNumber) {
        guestConditions.push({
          paymentGatewayResponse: {
            path: "$.donorIdCard",
            equals: pending.idCardNumber,
          },
        });
      }

      if (guestConditions.length > 0) {
        const claimed = await prisma.donation.updateMany({
          where: {
            donorId: null,
            OR: guestConditions,
          },
          data: {
            donorId: newUser.id,
          },
        });

        if (claimed.count > 0) {
          console.log(`🔗 Đã tự động liên kết ${claimed.count} khoản đóng góp của khách vãng lai vào tài khoản User ${newUser.id}`);
          await auditService.log({
            userId: newUser.id,
            action: "SYNC_GUEST_DONATIONS",
            entityName: "User",
            entityId: newUser.id,
            details: {
              claimedCount: claimed.count,
              idCardNumber: pending.idCardNumber,
              email: newUser.email,
            },
          });
        }
      }

      // Khởi tạo hồ sơ xác minh định danh nếu có cung cấp CCCD
      if (pending.idCardNumber) {
        await prisma.verification.upsert({
          where: { userId: newUser.id },
          create: {
            userId: newUser.id,
            idCardNumber: pending.idCardNumber,
            frontCardImage: "",
            backCardImage: "",
            portraitImage: "",
            status: "PENDING",
          },
          update: {
            idCardNumber: pending.idCardNumber,
          },
        }).catch(() => {});
      }
    } catch (linkErr) {
      console.warn("[CLAIM_GUEST_DONATIONS_WARN]:", linkErr);
    }

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
      otp,
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
      otp,
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
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();

    // 1. Kiểm tra tài khoản có đang bị khóa tạm 10 phút do nhập sai mật khẩu quá 5 lần không
    const lockInfo = await redisService.getLoginLock(email);
    if (lockInfo) {
      const remainingMinutes = Math.max(1, Math.ceil(lockInfo.remainingSeconds / 60));
      const error: any = new Error(
        `Tài khoản đã bị tạm khóa đăng nhập trong 10 phút do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng thử lại sau ${remainingMinutes} phút (${lockInfo.remainingSeconds} giây).`
      );
      error.statusCode = 429;
      error.remainingSeconds = lockInfo.remainingSeconds;
      throw error;
    }

    const user = await this.repo.findByEmail(email);
    if (!user) {
      // Ghi nhận lần thử thất bại để ngăn chặn kẻ tấn công dò tìm tài khoản
      const attempts = await redisService.recordFailedLoginAttempt(email, 600);
      if (attempts > 5) {
        await redisService.lockAccount(email, 600);
        const error: any = new Error(
          "Tài khoản đã bị tạm khóa đăng nhập trong 10 phút do nhập sai quá 5 lần liên tiếp. Vui lòng thử lại sau 10 phút."
        );
        error.statusCode = 429;
        throw error;
      }
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Ghi nhận lần nhập sai mật khẩu (cửa sổ 10 phút = 600s)
      const attempts = await redisService.recordFailedLoginAttempt(email, 600);
      if (attempts > 5) {
        await redisService.lockAccount(email, 600);
        const error: any = new Error(
          "Tài khoản đã bị tạm khóa đăng nhập trong 10 phút do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng thử lại sau 10 phút."
        );
        error.statusCode = 429;
        throw error;
      }
      const remainingAttempts = Math.max(0, 5 - attempts);
      const error: any = new Error(
        'Email hoặc mật khẩu không chính xác'
      );
      error.statusCode = 401;
      throw error;
    }

    // Đăng nhập thành công -> Xóa lịch sử sai và mở khóa tài khoản
    await redisService.clearFailedLoginAttempts(email);

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

  async refreshToken(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      const error: any = new Error("Yêu cầu Refresh Token để làm mới phiên đăng nhập");
      error.statusCode = 401;
      throw error;
    }

    const decoded = verifyRefreshToken(rawRefreshToken);
    if (!decoded) {
      const error: any = new Error("Refresh Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
      error.statusCode = 401;
      throw error;
    }

    const user = await this.repo.findById(decoded.userId);
    if (!user || user.status === UserStatus.BANNED || user.status === UserStatus.SUSPENDED) {
      const error: any = new Error("Tài khoản người dùng không tồn tại hoặc đã bị khóa.");
      error.statusCode = 403;
      throw error;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
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
