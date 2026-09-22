import { Router } from "express";
import { UserRole } from "@prisma/client";
import { verificationController } from "./verification.controller";
import { authenticate, authorize } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import { submitVerificationSchema, reviewVerificationSchema } from "./verification.validation";

const router = Router();

// Tất cả các API trong module Verification đều bắt buộc phải đăng nhập
router.use(authenticate);

/**
 * @route   POST /api/v1/verifications/request
 * @desc    Người dùng (Donater / USER) nộp hồ sơ KYC để xin quyền Gây quỹ (FUNDRAISER)
 * @access  Private (USER)
 */
router.post(
  "/request",
  validate(submitVerificationSchema),
  verificationController.handleSubmitVerification
);

/**
 * @route   GET /api/v1/verifications/my-status
 * @desc    Xem trạng thái hồ sơ xác minh của chính mình (PENDING, APPROVED, REJECTED)
 * @access  Private
 */
router.get(
  "/my-status",
  verificationController.handleGetMyStatus
);

/**
 * @route   GET /api/v1/verifications/pending
 * @desc    Quản trị viên xem danh sách các hồ sơ đang chờ duyệt
 * @access  Private (ADMIN)
 */
router.get(
  "/pending",
  authorize(UserRole.ADMIN),
  verificationController.handleGetPendingList
);

/**
 * @route   GET /api/v1/verifications/:id
 * @desc    Quản trị viên xem chi tiết hồ sơ xác minh
 * @access  Private (ADMIN)
 */
router.get(
  "/:id",
  authorize(UserRole.ADMIN),
  verificationController.handleGetDetail
);

/**
 * @route   PATCH /api/v1/verifications/:id/review
 * @desc    Quản trị viên duyệt (APPROVED -> nâng cấp lên FUNDRAISER) hoặc từ chối (REJECTED)
 * @access  Private (ADMIN)
 */
router.patch(
  "/:id/review",
  authorize(UserRole.ADMIN),
  validate(reviewVerificationSchema),
  verificationController.handleReviewVerification
);

export const verificationRouter = router;
