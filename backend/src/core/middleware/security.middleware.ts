import { Request, Response, NextFunction } from "express";
import { auditService } from "../services/audit.service";
import { sendError } from "../utils/response.util";

/**
 * Hàm đệ quy làm sạch các chuỗi, loại bỏ các thẻ HTML độc hại, script và handler XSS
 */
export function sanitizeValue(value: any): any {
  if (typeof value === "string") {
    return value
      // Loại bỏ các thẻ script và nội dung bên trong
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Loại bỏ các thẻ nhúng nguy hiểm: iframe, object, embed, style
      .replace(/<\/?(iframe|object|embed|style|applet|meta|link)[^>]*>/gi, "")
      // Loại bỏ các thuộc tính bắt sự kiện inline: onload=, onclick=, onerror=, v.v.
      .replace(/\s*on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "")
      // Loại bỏ các giao thức nguy hiểm trong URL: javascript:, vbscript:, data:text/html
      .replace(/javascript\s*:/gi, "blocked-script:")
      .replace(/vbscript\s*:/gi, "blocked-script:")
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value !== null && typeof value === "object") {
    const cleanedObj: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      cleanedObj[key] = sanitizeValue(value[key]);
    }
    return cleanedObj;
  }

  return value;
}

/**
 * Middleware phòng chống XSS: Tự động làm sạch req.body, req.query, req.params
 */
export const xssSanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === "object") {
    const cleanedQuery = sanitizeValue(req.query);
    try {
      req.query = cleanedQuery;
    } catch {
      Object.defineProperty(req, "query", {
        value: cleanedQuery,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  }

  if (req.params && typeof req.params === "object") {
    const cleanedParams = sanitizeValue(req.params);
    try {
      req.params = cleanedParams;
    } catch {
      Object.defineProperty(req, "params", {
        value: cleanedParams,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  }

  next();
};

/**
 * Middleware phòng chống CSRF (Cross-Site Request Forgery)
 * - Kiểm tra Origin / Referer đối với các phương thức thay đổi trạng thái (POST, PUT, PATCH, DELETE)
 * - Yêu cầu xác thực qua Bearer Token hoặc kiểm tra Same-Origin nghiêm ngặt
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): any => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 1. Nếu request sử dụng Authorization: Bearer <token>, nó được gửi thủ công bởi ứng dụng client
  // Trình duyệt KHÔNG tự động đính kèm header Authorization trong tấn công CSRF (Khác với Cookie).
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return next();
  }

  // 2. Đối với request dựa vào Cookie hoặc Session, kiểm tra header Origin/Referer
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const origin = req.headers.origin || req.headers.referer;

  if (origin) {
    const allowedHost = new URL(clientUrl).origin;
    try {
      const requestOrigin = new URL(origin).origin;
      if (requestOrigin !== allowedHost && !origin.includes("localhost")) {
        auditService.log({
          req,
          action: "CSRF_BLOCKED",
          entityName: "Security",
          entityId: "SYSTEM",
          details: {
            method: req.method,
            path: req.originalUrl,
            origin,
            expected: clientUrl,
          },
        });
        return sendError(res, 403, "Yêu cầu bị từ chối do vi phạm chính sách bảo mật CSRF (Invalid Origin)");
      }
    } catch {
      return sendError(res, 403, "Header Origin/Referer không hợp lệ");
    }
  }

  next();
};

/**
 * Helper kiểm tra quyền sở hữu đối tượng và ngăn chặn IDOR (Insecure Direct Object Reference)
 * Ném lỗi 403 và tự động ghi vết vi phạm vào AuditLog
 */
export async function guardResourceOwnership(
  req: Request,
  resourceOwnerId: string,
  entityName: string,
  entityId: string
): Promise<void> {
  const currentUser = (req as any).user;
  if (!currentUser) {
    const error: any = new Error("Yêu cầu đăng nhập");
    error.statusCode = 401;
    throw error;
  }

  // ADMIN có quyền can thiệp đặc quyền
  if (currentUser.role === "ADMIN") {
    return;
  }

  // Người dùng chỉ được thao tác trên tài nguyên của chính mình
  if (currentUser.userId !== resourceOwnerId) {
    // Tự động ghi vết nỗ lực tấn công IDOR vào AuditLog
    await auditService.log({
      req,
      userId: currentUser.userId,
      action: "IDOR_ATTEMPT_BLOCKED",
      entityName,
      entityId,
      details: {
        actorId: currentUser.userId,
        actorRole: currentUser.role,
        resourceOwnerId,
        path: req.originalUrl,
        method: req.method,
      },
    });

    const error: any = new Error("Bạn không có quyền thao tác trên tài nguyên của người khác (IDOR Protected)");
    error.statusCode = 403;
    throw error;
  }
}
