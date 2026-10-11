import { Request, Response, NextFunction } from "express";
import { donationService, DonationService } from "./donation.service";
import { sendCreated, sendSuccess } from "../../core/utils/response.util";

export class DonationController {
  constructor(private service: DonationService = donationService) {}

  /**
   * Tạo khoản quyên góp mới (Trả về mã VietQR ngân hàng hoặc MoMo)
   */
  createDonation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId;
      const result = await this.service.createDonation(req.body, currentUserId);
      const statusCode = result.replayed ? 200 : 201;
      return sendCreated(res, result.message, result.donation, {
        paymentInstructions: result.paymentInstructions,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Xác nhận thanh toán thành công (Mô phỏng Webhook / IPN / Cổng thanh toán)
   */
  confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const result = await this.service.confirmPayment(id, req.body);
      return sendSuccess(res, 200, result.message, result.donation, {
        campaignProgress: result.campaignProgress,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Admin xác nhận thanh toán mô phỏng (confirm-demo cho bài kiểm thử)
   */
  confirmDemo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const result = await this.service.confirmDemo(req.user!, id);
      return sendSuccess(res, 200, "Xác nhận thanh toán mô phỏng thành công", result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Hoàn tiền quyên góp khi chiến dịch hủy hoặc hết hạn không đạt mục tiêu
   */
  refund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const reason = req.body?.reason;
      const result = await this.service.refund(req.user!, id, reason);
      return sendSuccess(res, 200, "Hoàn tiền mô phỏng thành công", result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Hủy chiến dịch (Dành cho Admin)
   */
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaignId = String(req.params.campaignId);
      const reason = req.body?.reason;
      const result = await this.service.cancelCampaign(req.user!, campaignId, reason);
      return sendSuccess(res, 200, "Đã hủy chiến dịch", result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Đối soát số dư sổ cái và cache (Dành cho Admin)
   */
  reconcile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaignId = String(req.params.campaignId);
      const result = await this.service.reconcile(req.user!, campaignId);
      return sendSuccess(res, 200, "Đối soát bút toán", result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lấy danh sách quyên góp công khai của một chiến dịch
   */
  getCampaignDonations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaignId = String(req.params.campaignId);
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await this.service.getCampaignDonations(campaignId, page, limit);
      return sendSuccess(res, 200, "Lấy danh sách ủng hộ thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lịch sử quyên góp của tài khoản cá nhân đang đăng nhập
   */
  getMyDonations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await this.service.getMyDonations(userId, page, limit);
      return sendSuccess(res, 200, "Lấy lịch sử quyên góp thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Tra cứu chi tiết một giao dịch quyên góp
   */
  getDonationDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const currentUserId = req.user?.userId;
      const userRole = req.user?.role;
      const result = await this.service.getDonationDetail(id, currentUserId, userRole);
      return sendSuccess(res, 200, "Lấy chi tiết giao dịch thành công", result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Admin tra cứu toàn bộ giao dịch quyên góp trên hệ thống
   */
  getAllDonationsForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getAllDonationsForAdmin(req.query as any);
      return sendSuccess(res, 200, "Lấy toàn bộ giao dịch quyên góp thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };
}

export const donationController = new DonationController();
