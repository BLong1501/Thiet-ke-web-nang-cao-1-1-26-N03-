import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate, authorize } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import { userQuerySchema, updateUserStatusSchema } from "./user.validation";
import { UserRole } from "@prisma/client";

const router = Router();

// Tất cả routes quản lý user đều yêu cầu quyền ADMIN
router.use(authenticate, authorize(UserRole.ADMIN));

// Lấy danh sách toàn bộ người dùng có phân trang, lọc và tìm kiếm
router.get("/", validate({ query: userQuerySchema }), userController.getUsers);

// Lấy chi tiết thông tin một người dùng
router.get("/:id", userController.getUserDetail);

// Cập nhật trạng thái người dùng (ACTIVE, SUSPENDED, BANNED)
router.patch("/:id/status", validate(updateUserStatusSchema), userController.updateUserStatus);

export default router;
export { router as userRouter };
