import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { verifyAccessToken, JwtPayload } from "../utils/jwt.util";
import { sendError } from "../utils/response.util";

// Mở rộng kiểu dữ liệu Request của Express để chứa thông tin người dùng đã xác thực
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): any => {
  let token: string | undefined;

  // Lấy token từ header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.accessToken) {
    // Hoặc lấy từ HttpOnly cookie
    token = req.cookies.accessToken;
  }

  if (!token) {
    return sendError(res, 401, "Yêu cầu đăng nhập để truy cập tài nguyên này");
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return sendError(res, 401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
  }

  req.user = decoded;
  return next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return sendError(res, 401, "Yêu cầu đăng nhập");
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        "Bạn không có quyền hạn (Permission Denied) để thực hiện hành động này"
      );
    }

    return next();
  };
};
