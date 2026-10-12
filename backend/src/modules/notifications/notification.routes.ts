import { Router } from "express";
import { notificationController } from "./notification.controller";
import { authenticate } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import {
  notificationIdParamSchema,
  notificationQuerySchema,
} from "./notification.validation";

const router = Router();

// Mọi thao tác đều gắn với người dùng đang đăng nhập; không nhận userId từ client.
router.use(authenticate);

router.get("/", validate({ query: notificationQuerySchema }), notificationController.list);
router.get("/unread-count", notificationController.unreadCount);
router.patch("/read-all", notificationController.markAllRead);
router.patch(
  "/:id/read",
  validate({ params: notificationIdParamSchema }),
  notificationController.markRead,
);

export default router;
export { router as notificationRouter };
