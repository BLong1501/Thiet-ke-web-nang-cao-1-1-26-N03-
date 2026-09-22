import bcrypt from "bcrypt";
import { UserStatus } from "@prisma/client";
import { authRepository, AuthRepository } from "./auth.repository";
import { RegisterInput, LoginInput } from "./auth.validation";
import { generateAccessToken, generateRefreshToken } from "../../core/utils/jwt.util";

export class AuthService {
  constructor(private repo: AuthRepository = authRepository) {}

  async register(input: RegisterInput) {
    const existingUser = await this.repo.findByEmail(input.email);
    if (existingUser) {
      const error: any = new Error("Địa chỉ email này đã được sử dụng bởi một tài khoản khác");
      error.statusCode = 409;
      throw error;
    }

    // Băm mật khẩu với salt rounds = 10 (Chuẩn OWASP)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const newUser = await this.repo.createUser({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
    });

    const tokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: newUser,
      accessToken,
      refreshToken,
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

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      const error: any = new Error("Email hoặc mật khẩu không chính xác");
      error.statusCode = 401;
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
