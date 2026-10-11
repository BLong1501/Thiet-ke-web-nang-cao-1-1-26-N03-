import { Router } from "express";
import { donationController } from "./donation.controller";
import { authenticate, authorize, optionalAuthenticate } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import {
  createDonationSchema,
  confirmDonationSchema,
  reasonSchema,
  emptyActionSchema,
  donationQuerySchema,
} from "./donation.validation";
import { UserRole } from "@prisma/client";

const router = Router();

// ==========================================
// 1. PUBLIC & DONOR ROUTES
// ==========================================

// Tạo yêu cầu quyên góp (Khách vãng lai hoặc User đã đăng nhập)
router.post(
  "/",
  optionalAuthenticate,
  validate(createDonationSchema),
  donationController.createDonation
);

// Mô phỏng xác nhận thanh toán thành công (Webhook / IPN / Cổng thanh toán)
router.post(
  "/:id/confirm",
  validate(confirmDonationSchema),
  donationController.confirmPayment
);

// Danh sách nhà hảo tâm của một chiến dịch (Công khai)
router.get("/campaign/:campaignId", donationController.getCampaignDonations);

// ==========================================
// 2. AUTHENTICATED USER ROUTES
// ==========================================

// Lịch sử các khoản quyên góp của tôi
router.get("/my/history", authenticate, donationController.getMyDonations);

// Yêu cầu hoàn tiền khi chiến dịch bị hủy hoặc không đạt mục tiêu
router.post(
  "/:id/refund",
  authenticate,
  validate(reasonSchema),
  donationController.refund
);

// ==========================================
// 3. ADMIN ROUTES (Quản trị & Kiểm thử Buổi 6)
// ==========================================

// Admin xác nhận thanh toán mô phỏng (Dành cho kịch bản kiểm thử)
router.post(
  "/:id/confirm-demo",
  authenticate,
  authorize(UserRole.ADMIN),
  validate(emptyActionSchema),
  donationController.confirmDemo
);

// Admin hủy chiến dịch chưa giải ngân
router.post(
  "/campaigns/:campaignId/cancel",
  authenticate,
  authorize(UserRole.ADMIN),
  validate(reasonSchema),
  donationController.cancel
);

// Admin đối soát số dư sổ cái và cache
router.get(
  "/campaigns/:campaignId/reconciliation",
  authenticate,
  authorize(UserRole.ADMIN),
  donationController.reconcile
);

// Quản trị viên đối soát toàn bộ giao dịch trên hệ thống
router.get(
  "/admin/all",
  authenticate,
  authorize(UserRole.ADMIN),
  validate({ query: donationQuerySchema }),
  donationController.getAllDonationsForAdmin
);

// ==========================================
// 4. DETAIL ROUTE (Đặt cuối cùng)
// ==========================================

// Tra cứu chi tiết một giao dịch quyên góp
router.get("/:id", optionalAuthenticate, donationController.getDonationDetail);

export default router;
export { router as donationRouter };
