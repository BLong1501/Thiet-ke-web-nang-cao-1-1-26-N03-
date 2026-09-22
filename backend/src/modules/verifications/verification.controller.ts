import { Request, Response, NextFunction } from "express";
import { verificationService, VerificationService } from "./verification.service";
import { sendSuccess } from "../../core/utils/response.util";

export class VerificationController {
  constructor(private service: VerificationService = verificationService) {}

  handleSubmitVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.service.submitVerification(userId, req.body);
      return sendSuccess(res, 201, result.message, result.verification);
    } catch (error) {
      return next(error);
    }
  };

  handleGetMyStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = await this.service.getMyVerificationStatus(userId);
      return sendSuccess(res, 200, "Lấy trạng thái hồ sơ xác minh thành công", data);
    } catch (error) {
      return next(error);
    }
  };

  handleGetPendingList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const result = await this.service.getPendingVerifications(page, limit);
      return sendSuccess(res, 200, "Lấy danh sách hồ sơ chờ duyệt thành công", result.items, result.meta);
    } catch (error) {
      return next(error);
    }
  };

  handleGetDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getVerificationDetail(id);
      return sendSuccess(res, 200, "Lấy chi tiết hồ sơ xác minh thành công", data);
    } catch (error) {
      return next(error);
    }
  };

  handleReviewVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.userId;
      const id = String(req.params.id);
      const result = await this.service.reviewVerification(adminId, id, req.body);
      return sendSuccess(res, 200, result.message, result);
    } catch (error) {
      return next(error);
    }
  };
}

export const verificationController = new VerificationController();
