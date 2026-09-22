import { Request, Response, NextFunction } from "express";
import { authService, AuthService } from "./auth.service";
import { sendSuccess, sendError } from "../../core/utils/response.util";

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const result = await this.service.register(req.body);

      // Thiết lập Refresh Token trong HttpOnly Cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
      });

      return sendSuccess(res, 201, "Đăng ký tài khoản thành công", {
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error: any) {
      if (error.statusCode) {
        return sendError(res, error.statusCode, error.message);
      }
      return next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const result = await this.service.login(req.body);

      // Thiết lập Refresh Token trong HttpOnly Cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
      });

      return sendSuccess(res, 200, "Đăng nhập thành công", {
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error: any) {
      if (error.statusCode) {
        return sendError(res, error.statusCode, error.message);
      }
      return next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const userId = req.user!.userId;
      const user = await this.service.getProfile(userId);
      return sendSuccess(res, 200, "Lấy thông tin tài khoản thành công", user);
    } catch (error: any) {
      if (error.statusCode) {
        return sendError(res, error.statusCode, error.message);
      }
      return next(error);
    }
  };
}

export const authController = new AuthController();
