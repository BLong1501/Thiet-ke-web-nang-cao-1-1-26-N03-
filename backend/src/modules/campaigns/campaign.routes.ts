import { Router } from "express";
import { campaignController } from "./campaign.controller";
import { authenticate, authorize, optionalAuthenticate } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  reviewCampaignSchema,
  addMediaSchema,
  createUpdateSchema,
  categorySchema,
  createDisbursementSchema,
  lookupBankAccountSchema,
} from "./campaign.validation";
import { UserRole } from "@prisma/client";


const router = Router();

// ==========================================
// 1. PUBLIC ROUTES (Mọi người đều xem được)
// ==========================================

// Danh sách ngân hàng hợp lệ thuộc Napas 247 (Public)
router.get("/supported-banks", campaignController.getSupportedBanks);

// Tra cứu thông tin tài khoản ngân hàng liên ngân hàng (Account Lookup)
router.post(
  "/lookup-bank-account",
  authenticate,
  validate(lookupBankAccountSchema),
  campaignController.lookupBankAccount
);

// Danh mục chiến dịch (Public)
router.get("/categories", campaignController.getCategories);

// Danh sách chiến dịch công khai có phân trang, lọc, tìm kiếm
router.get(
  "/",
  optionalAuthenticate,
  validate({ query: campaignQuerySchema }),
  campaignController.getCampaigns
);

// ==========================================
// 2. FUNDRAISER ROUTES (Người gây quỹ & Admin)
// ==========================================

// Danh sách chiến dịch do chính tôi tạo
router.get(
  "/my/list",
  authenticate,
  authorize(UserRole.FUNDRAISER),
  campaignController.getMyCampaigns
);

// Khởi tạo chiến dịch mới
router.post(
  "/",
  authenticate,
  authorize(UserRole.FUNDRAISER),
  validate(createCampaignSchema),
  campaignController.createCampaign
);

// Chỉnh sửa chiến dịch (Chỉ khi DRAFT hoặc PENDING_APPROVAL)
router.put(
  "/:id",
  authenticate,
  authorize(UserRole.FUNDRAISER),
  validate(updateCampaignSchema),
  campaignController.updateCampaign
);

// Thêm ảnh/video tài liệu minh chứng
router.post(
  "/:id/media",
  authenticate,
  authorize(UserRole.FUNDRAISER),
  validate(addMediaSchema),
  campaignController.addMedia
);

// Đăng nhật ký cập nhật tiến độ
router.post(
  "/:id/updates",
  authenticate,
  authorize(UserRole.FUNDRAISER),
  validate(createUpdateSchema),
  campaignController.addUpdate
);

// Đăng chứng từ minh chứng giải ngân minh bạch
router.post(
  "/:id/disbursements",
  authenticate,
  authorize(UserRole.FUNDRAISER),
  validate(createDisbursementSchema),
  campaignController.addDisbursement
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
router.get("/:idOrSlug", optionalAuthenticate, campaignController.getCampaignDetail);

export default router;
export { router as campaignRouter };
