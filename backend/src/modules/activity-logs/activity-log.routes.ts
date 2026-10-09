import { Router } from "express";
import { activityLogController } from "./activity-log.controller";
import { authenticate, authorize } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import { auditLogQuerySchema } from "./activity-log.validation";
import { UserRole } from "@prisma/client";

const router = Router();

// Tất cả các route nhật ký hệ thống yêu cầu quyền ADMIN
router.use(authenticate, authorize(UserRole.ADMIN));

/**
 * GET /api/v1/activity-logs/stats
 * Thống kê tổng hợp nhật ký hệ thống (phải đặt trước /:id để không bị bắt nhầm)
 */
router.get("/stats", activityLogController.getStats);

/**
 * GET /api/v1/activity-logs/user/:userId
 * Nhật ký hoạt động của một người dùng cụ thể
 */
router.get("/user/:userId", activityLogController.getUserLogs);

/**
 * GET /api/v1/activity-logs
 * Danh sách toàn bộ nhật ký có tìm kiếm, lọc, phân trang
 */
router.get("/", validate({ query: auditLogQuerySchema }), activityLogController.getLogs);

/**
 * GET /api/v1/activity-logs/:id
 * Chi tiết một bản ghi nhật ký
 */
router.get("/:id", activityLogController.getLogById);

export default router;
export { router as activityLogRouter };
