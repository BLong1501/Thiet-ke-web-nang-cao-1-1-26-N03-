import { Router } from "express";
import { donationController } from "./donation.controller";
import { authenticate, authorize, optionalAuthenticate } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import {
  createDonationSchema,
  confirmDonationSchema,
  reasonSchema,
  requestRefundSchema,
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

// Tra cứu trạng thái thanh toán công khai (phục vụ Polling tự động tại giao diện VietQR)
router.get("/:id/status", donationController.getPublicStatus);

// Webhook tự động biến động số dư ngân hàng (SePay / Casso / PayOS / Banking Webhook)
router.post("/webhook", donationController.handleBankingWebhook);

// Mô phỏng chuyển khoản thành công (dành cho kiểm thử/demo trên modal)
router.post("/:id/simulate-success", donationController.simulateSuccess);

// Xác nhận thanh toán: chỉ chủ khoản đóng góp hoặc ADMIN (không cho đoán ID).
router.post(
  "/:id/confirm",
  authenticate,
  validate(confirmDonationSchema),
  donationController.confirmPayment
);

// Danh sách nhà hảo tâm của một chiến dịch (Công khai)
router.get("/campaign/:campaignId", donationController.getCampaignDonations);

// ==========================================
// 2. AUTHENTICATED USER & FUNDRAISER ROUTES
// ==========================================

// Danh sách đối soát quyên góp nội bộ (Chỉ chủ sở hữu chiến dịch / Admin mới xem được đầy đủ Email & SĐT)
router.get(
  "/campaign/:campaignId/manage-donations",
  authenticate,
  authorize(UserRole.FUNDRAISER, UserRole.ADMIN),
  donationController.getFundraiserDonations
);

// Lịch sử các khoản quyên góp của tôi
router.get("/my/history", authenticate, donationController.getMyDonations);

// Danh sách các đơn yêu cầu hoàn tiền của tôi
router.get("/my/refund-requests", authenticate, donationController.getMyRefundRequests);

// Yêu cầu hoàn tiền khi chiến dịch bị hủy hoặc không đạt mục tiêu
router.post(
  "/:id/refund",
  authenticate,
  validate(reasonSchema),
  donationController.refund
);

// Nhà hảo tâm gửi đơn yêu cầu hoàn tiền (Kèm thông tin CCCD và Ngân hàng nhận)
router.post(
  "/:id/request-refund",
  authenticate,
  validate(requestRefundSchema),
  donationController.requestRefund
);

// ==========================================
// 3. ADMIN ROUTES (Quản trị & Kiểm thử Buổi 6)
// ==========================================

// Danh sách tất cả các đơn yêu cầu hoàn tiền dành cho Admin
router.get(
  "/admin/refund-requests",
  authenticate,
  authorize(UserRole.ADMIN),
  donationController.getAdminRefundRequests
);

// Admin duyệt hoặc từ chối đơn yêu cầu hoàn tiền
router.post(
  "/:id/review-refund",
  authenticate,
  authorize(UserRole.ADMIN),
  donationController.reviewRefund
);

// Admin xác nhận thanh toán mô phỏng (Dành cho kịch bản kiểm thử)
router.post(
  "/:id/confirm-demo",
  authenticate,
  authorize(UserRole.ADMIN),
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

// Tra cứu chi tiết một giao dịch quyên góp (Khách vãng lai, Admin, hoặc Donor đã đăng nhập)
router.get("/:id", optionalAuthenticate, donationController.getDonationDetail);

export default router;
export { router as donationRouter };
