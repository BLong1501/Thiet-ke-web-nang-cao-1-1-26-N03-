import { Request, Response, NextFunction } from "express";
import { activityLogRepository } from "../../modules/activity-logs/activity-log.repository";

/**
 * Danh sách các route cần ghi nhật ký tự động (action label : pattern)
 * Format: METHOD /api/v1/path -> action
 */
const LOGGABLE_ROUTES: Array<{
  method: string;
  pattern: RegExp;
  action: string;
  entityName: string;
}> = [
  // Auth
  { method: "POST", pattern: /\/api\/v1\/auth\/login$/, action: "USER_LOGIN", entityName: "User" },
  { method: "POST", pattern: /\/api\/v1\/auth\/logout$/, action: "USER_LOGOUT", entityName: "User" },
  { method: "POST", pattern: /\/api\/v1\/auth\/register$/, action: "USER_REGISTER", entityName: "User" },

  // Campaigns
  { method: "POST", pattern: /\/api\/v1\/campaigns$/, action: "CREATE_CAMPAIGN", entityName: "Campaign" },
  { method: "PUT", pattern: /\/api\/v1\/campaigns\/[^/]+$/, action: "UPDATE_CAMPAIGN", entityName: "Campaign" },
  { method: "PATCH", pattern: /\/api\/v1\/campaigns\/[^/]+\/review$/, action: "REVIEW_CAMPAIGN", entityName: "Campaign" },

  // Verifications (KYC)
  { method: "POST", pattern: /\/api\/v1\/verifications$/, action: "SUBMIT_KYC", entityName: "Verification" },
  { method: "PATCH", pattern: /\/api\/v1\/verifications\/[^/]+\/review$/, action: "REVIEW_KYC", entityName: "Verification" },

  // Profile
  { method: "PUT", pattern: /\/api\/v1\/profile$/, action: "UPDATE_PROFILE", entityName: "User" },
  { method: "PUT", pattern: /\/api\/v1\/profile\/password$/, action: "CHANGE_PASSWORD", entityName: "User" },
];

/**
 * Middleware tự động ghi nhật ký hệ thống sau khi response được gửi đi thành công
 */
export const auditLogMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Chỉ xử lý các phương thức thay đổi trạng thái
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  // Tìm route khớp
  const matchedRoute = LOGGABLE_ROUTES.find(
    (r) => r.method === req.method && r.pattern.test(req.path)
  );
  if (!matchedRoute) return next();

  // Hook vào sự kiện sau khi response đã gửi
  res.on("finish", async () => {
    // Chỉ ghi log khi thành công (2xx)
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    try {
      const user = (req as any).user;
      const userId = user?.id;

      // Lấy entityId từ params hoặc body
      const entityId =
        req.params.id ||
        req.params.idOrSlug ||
        req.params.userId ||
        (req.body as any)?.id ||
        "unknown";

      await activityLogRepository.create({
        userId,
        action: matchedRoute.action,
        entityName: matchedRoute.entityName,
        entityId,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          bodyKeys: req.body ? Object.keys(req.body) : [],
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "unknown",
        userAgent: req.headers["user-agent"]?.substring(0, 255) || "unknown",
      });
    } catch (err) {
      // Không để lỗi ghi log ảnh hưởng đến response chính
      console.error("[AuditLog Middleware] Failed to write log:", err);
    }
  });

  next();
};
