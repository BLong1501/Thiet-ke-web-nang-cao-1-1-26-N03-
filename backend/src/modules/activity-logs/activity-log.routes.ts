import { Router } from "express";
import { UserRole } from "@prisma/client";
import { activityLogController } from "./activity-log.controller";
import { authenticate, authorize } from "../../core/middleware/auth.middleware";
import { validateRequest } from "../../core/middleware/validate.middleware";
import {
  activityLogQuerySchema,
  activityLogStatsQuerySchema,
  activityLogIdSchema,
  activityLogUserSchema,
  personalActivityLogQuerySchema,
} from "./activity-log.validation";

const router = Router();

// Personal activity is scoped to the verified token, never a client-supplied userId.
router.use(authenticate);
router.get(
  "/me",
  validateRequest({ query: personalActivityLogQuerySchema }),
  activityLogController.getMyLogs
);

// System-wide, arbitrary-user, detail and write access remains admin-only.
router.use(authorize(UserRole.ADMIN));

// 1. Thống kê số liệu nhật ký hệ thống
router.get(
  "/stats",
  validateRequest({ query: activityLogStatsQuerySchema }),
  activityLogController.getStats
);

// 2. Lấy danh sách nhật ký của một người dùng cụ thể
router.get(
  "/user/:userId",
  validateRequest({ query: activityLogQuerySchema, params: activityLogUserSchema }),
  activityLogController.getUserLogs
);

// 3. Lấy chi tiết một bản ghi nhật ký
router.get("/:id", validateRequest({ params: activityLogIdSchema }), activityLogController.getLogById);

// 4. Lấy danh sách toàn bộ nhật ký có phân trang, lọc và tìm kiếm
router.get(
  "/",
  validateRequest({ query: activityLogQuerySchema }),
  activityLogController.getLogs
);


export default router;
export { router as activityLogRouter };
