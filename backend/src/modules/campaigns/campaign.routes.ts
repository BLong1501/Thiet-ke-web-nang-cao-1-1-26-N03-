import { Router } from "express";
import { campaignController } from "./campaign.controller";
import { authenticate, authorize } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  reviewCampaignSchema,
  addMediaSchema,
  createUpdateSchema,
  categorySchema,
} from "./campaign.validation";
import { UserRole } from "@prisma/client";

const router = Router();

// ==========================================
// 1. PUBLIC ROUTES (Mọi người đều xem được)
// ==========================================

// Danh mục chiến dịch (Public)
router.get("/categories", campaignController.getCategories);

// Danh sách chiến dịch công khai có phân trang, lọc, tìm kiếm
router.get("/", validate({ query: campaignQuerySchema }), campaignController.getCampaigns);

// ==========================================
// 2. FUNDRAISER ROUTES (Người gây quỹ & Admin)
// ==========================================

// Danh sách chiến dịch do chính tôi tạo
router.get(
  "/my/list",
  authenticate,
  authorize(UserRole.FUNDRAISER, UserRole.ADMIN),
  campaignController.getMyCampaigns
);

// Khởi tạo chiến dịch mới
router.post(
  "/",
  authenticate,
  authorize(UserRole.FUNDRAISER, UserRole.ADMIN),
  validate(createCampaignSchema),
  campaignController.createCampaign
);

// Chỉnh sửa chiến dịch (Chỉ khi DRAFT hoặc PENDING_APPROVAL)
router.put(
  "/:id",
  authenticate,
  authorize(UserRole.FUNDRAISER, UserRole.ADMIN),
  validate(updateCampaignSchema),
  campaignController.updateCampaign
);

// Thêm ảnh/video tài liệu minh chứng
router.post(
  "/:id/media",
  authenticate,
  authorize(UserRole.FUNDRAISER, UserRole.ADMIN),
  validate(addMediaSchema),
  campaignController.addMedia
);

// Đăng nhật ký cập nhật tiến độ
router.post(
  "/:id/updates",
  authenticate,
  authorize(UserRole.FUNDRAISER, UserRole.ADMIN),
  validate(createUpdateSchema),
  campaignController.addUpdate
);

// ==========================================
// 3. ADMIN ROUTES (Dành riêng cho Quản trị viên)
// ==========================================

// Danh sách chiến dịch chờ duyệt
router.get(
  "/admin/pending",
  authenticate,
  authorize(UserRole.ADMIN),
  campaignController.getPendingCampaigns
);

// Phê duyệt hoặc từ chối chiến dịch
router.patch(
  "/:id/review",
  authenticate,
  authorize(UserRole.ADMIN),
  validate(reviewCampaignSchema),
  campaignController.reviewCampaign
);

// Quản lý danh mục (Admin)
router.post(
  "/categories",
  authenticate,
  authorize(UserRole.ADMIN),
  validate(categorySchema),
  campaignController.createCategory
);

router.put(
  "/categories/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  validate(categorySchema.partial()),
  campaignController.updateCategory
);

router.delete(
  "/categories/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  campaignController.deleteCategory
);

// ==========================================
// 4. CHI TIẾT CHIẾN DỊCH (Đặt cuối cùng để không trùng route cụ thể)
// ==========================================
router.get("/:idOrSlug", campaignController.getCampaignDetail);

export default router;
export { router as campaignRouter };
