import { Request, Response, NextFunction } from "express";
import { authService, AuthService } from "./auth.service";
import { sendSuccess } from "../../core/utils/response.util";
import { auditService } from "../../core/services/audit.service";
import { isRevoked, revoke } from '../../core/auth/token-revocation';

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.register(req.body);
      return sendSuccess(res, 201, result.message);
    } catch (error) {
      return next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.verifyEmail(req.body);
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      return sendSuccess(res, 200, result.message, {
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      return next(error);
    }
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.resendVerificationOtp(req.body);
      return sendSuccess(res, 200, result.message);
    } catch (error) {
      return next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.forgotPassword(req.body);
      return sendSuccess(res, 200, result.message);
    } catch (error) {
      return next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.resetPassword(req.body);
      return sendSuccess(res, 200, result.message);
    } catch (error) {
      return next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.login(req.body);
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      // Ghi nhật ký đăng nhập thành công
      await auditService.log({
        req,
        userId: result.user.id,
        action: "LOGIN_SUCCESS",
        entityName: "User",
        entityId: result.user.id,
        details: { email: result.user.email, role: result.user.role },
      });

      return sendSuccess(res, 200, "Đăng nhập thành công", {
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      // Ghi nhật ký đăng nhập thất bại / khóa tài khoản
      try {
        const isLocked = (error as any)?.statusCode === 429;
        await auditService.log({
          req,
          action: isLocked ? "ACCOUNT_LOCKED_TEMPORARY" : "LOGIN_FAILED",
          entityName: "User",
          entityId: req.body?.email || "UNKNOWN",
          details: {
            email: req.body?.email,
            error: (error as any)?.message,
            statusCode: (error as any)?.statusCode || 401,
          },
        });
      } catch {}
      return next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (typeof token==='string' && await isRevoked(token)) throw Object.assign(new Error('Phiên đã kết thúc'),{statusCode:401});
      const result = await this.service.refreshToken(token);
        await revoke(token);

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return sendSuccess(res, 200, "Làm mới mã truy cập (Access Token) thành công", {
        accessToken: result.accessToken,
      });
    } catch (error) {
      return next(error);
    }
  };

  loginWithGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = req.body;
      const result = await this.service.loginWithGoogle(idToken);
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      return sendSuccess(res, 200, result.message, {
        user: result.user,
        accessToken: result.accessToken,
        isProfileComplete: result.isProfileComplete,
      });
    } catch (error) {
      return next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const user = await this.service.getProfile(userId);
      return sendSuccess(res, 200, "Lấy thông tin tài khoản thành công", user);
    } catch (error) {
      return next(error);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await revoke(_req.headers.authorization?.startsWith('Bearer ') ? _req.headers.authorization.slice(7) : _req.cookies?.accessToken);
        await revoke(_req.cookies?.refreshToken);
        res.clearCookie('accessToken');
      res.clearCookie("refreshToken");
      return sendSuccess(res, 200, "Đăng xuất thành công");
    } catch (error) {
      return next(error);
    }
  };
}

export const authController = new AuthController();
