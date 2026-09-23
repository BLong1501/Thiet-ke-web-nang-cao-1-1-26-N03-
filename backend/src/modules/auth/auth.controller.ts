import { Request, Response, NextFunction } from "express";
import { authService, AuthService } from "./auth.service";
import { sendSuccess } from "../../core/utils/response.util";

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
      return sendSuccess(res, 200, "Đăng nhập thành công", {
        user: result.user,
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
      res.clearCookie("refreshToken");
      return sendSuccess(res, 200, "Đăng xuất thành công");
    } catch (error) {
      return next(error);
    }
  };
}

export const authController = new AuthController();
