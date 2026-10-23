import { auditService } from "../../core/services/audit.service";
import { Request, Response, NextFunction } from "express";
import { campaignService } from "./campaign.service";
import { sendSuccess, sendCreated } from "../../core/utils/response.util";
import { CampaignQueryInput } from "./campaign.validation";
import { applyPublicCacheHeaders, CampaignCacheTTL } from "../../core/cache/campaign-cache";

export class CampaignController {
  /**
   * [GET /api/v1/campaigns] Danh sách chiến dịch công khai
   */
  async getCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as CampaignQueryInput;
      const result = await campaignService.getCampaigns(query, req.user);
      applyPublicCacheHeaders(res, result.cacheStatus, CampaignCacheTTL.list);
      return sendSuccess(
        res,
        200,
        "Lấy danh sách chiến dịch thành công",
        result.items,
        result.meta
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * [GET /api/v1/campaigns/:idOrSlug] Chi tiết chiến dịch
   */
  async getCampaignDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const idOrSlug = String(req.params.idOrSlug);
      const result = await campaignService.getCampaignDetail(idOrSlug, req.user);
      applyPublicCacheHeaders(res, result.cacheStatus, CampaignCacheTTL.detail);
      return sendSuccess(res, 200, "Lấy thông tin chi tiết chiến dịch thành công", result.campaign);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [GET /api/v1/campaigns/my/list] Danh sách chiến dịch của tôi (Fundraiser)
   */
  async getMyCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await campaignService.getMyCampaigns(userId, page, limit);
      return sendSuccess(
        res,
        200,
        "Lấy danh sách chiến dịch của bạn thành công",
        result.items,
        result.meta
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * [POST /api/v1/campaigns] Khởi tạo chiến dịch (Fundraiser / Admin)
   */
  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as any).user;
      const campaign = await campaignService.createCampaign(userId, role, req.body);
      return sendCreated(res, "Khởi tạo chiến dịch gây quỹ thành công", campaign);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [PUT /api/v1/campaigns/:id] Cập nhật chiến dịch
   */
  async updateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as any).user;
      const id = String(req.params.id);
      const updated = await campaignService.updateCampaign(userId, role, id, req.body);
      await auditService.log({ req, action: "UPDATE_CAMPAIGN", entityName: "Campaign", entityId: updated.id });
      return sendSuccess(res, 200, "Cập nhật thông tin chiến dịch thành công", updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [GET /api/v1/campaigns/admin/pending] Danh sách chiến dịch chờ duyệt (Admin)
   */
  async getPendingCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await campaignService.getPendingCampaigns(page, limit);
      return sendSuccess(
        res,
        200,
        "Lấy danh sách chiến dịch chờ duyệt thành công",
        result.items,
        result.meta
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * [PATCH /api/v1/campaigns/:id/review] Duyệt / Từ chối chiến dịch (Admin)
   */
  async reviewCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const id = String(req.params.id);
      const result = await campaignService.reviewCampaign(adminId, id, req.body);
      return sendSuccess(res, 200, result.message, result.campaign);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [POST /api/v1/campaigns/:id/media] Thêm ảnh/video minh chứng
   */
  async addMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as any).user;
      const id = String(req.params.id);
      const media = await campaignService.addMedia(userId, role, id, req.body);
      await auditService.log({ req, action: "CREATE_MEDIA", entityName: "CampaignMedia", entityId: media.id });
      return sendCreated(res, "Thêm tài liệu minh chứng thành công", media);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [POST /api/v1/campaigns/:id/updates] Thêm nhật ký cập nhật tiến độ
   */
  async addUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as any).user;
      const id = String(req.params.id);
      const update = await campaignService.addUpdate(userId, role, id, req.body);
      await auditService.log({ req, action: "CREATE_UPDATE", entityName: "CampaignUpdate", entityId: update.id });
      return sendCreated(res, "Đăng nhật ký cập nhật tiến độ thành công", update);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [POST /api/v1/campaigns/:id/disbursements] Đăng minh chứng giải ngân minh bạch
   */
  async addDisbursement(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as any).user;
      const id = String(req.params.id);
      const disbursement = await campaignService.addDisbursement(userId, role, id, req.body);
      return sendCreated(res, "Đăng thông tin giải ngân thành công", disbursement);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [GET /api/v1/campaigns/admin/disbursements] Admin lấy danh sách toàn bộ chứng từ giải ngân
   */
  async getAdminDisbursements(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
      const data = await campaignService.getAdminDisbursements(page, limit);
      return sendSuccess(res, 200, "Lấy danh sách giải ngân thành công", data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [PATCH /api/v1/campaigns/admin/disbursements/:id/review] Admin phê duyệt hoặc từ chối giải ngân
   */
  async reviewDisbursement(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.userId;
      const id = String(req.params.id);
      const updated = await campaignService.reviewDisbursement(adminId, id, req.body);
      const actionMsg = req.body.status === "APPROVED" ? "Phê duyệt hồ sơ giải ngân thành công" : "Từ chối hồ sơ giải ngân thành công";
      return sendSuccess(res, 200, actionMsg, updated);
    } catch (error) {
      next(error);
    }
  }


  // ==========================================
  // CATEGORIES CONTROLLER METHODS
  // ==========================================

  /**
   * [GET /api/v1/campaigns/categories] Lấy danh mục chiến dịch công khai
   */
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const isActiveOnly = req.query.all !== "true";
      const result = await campaignService.getCategories(isActiveOnly);
      applyPublicCacheHeaders(res, result.cacheStatus, CampaignCacheTTL.categories);
      return sendSuccess(res, 200, "Lấy danh mục thành công", result.categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [POST /api/v1/campaigns/categories] Tạo danh mục (Admin)
   */
  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await campaignService.createCategory(req.body);
      await auditService.log({ req, action: "CREATE_CATEGORY", entityName: "Category", entityId: category.id });
      return sendCreated(res, "Tạo danh mục mới thành công", category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [PUT /api/v1/campaigns/categories/:id] Cập nhật danh mục (Admin)
   */
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const updated = await campaignService.updateCategory(id, req.body);
      await auditService.log({ req, action: "UPDATE_CATEGORY", entityName: "Category", entityId: updated.id });
      return sendSuccess(res, 200, "Cập nhật danh mục thành công", updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [DELETE /api/v1/campaigns/categories/:id] Xóa danh mục (Admin)
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await campaignService.deleteCategory(id);
      await auditService.log({ req, action: "DELETE_CATEGORY", entityName: "Category", entityId: id });
      return sendSuccess(res, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [GET /api/v1/campaigns/supported-banks] Danh sách ngân hàng hợp lệ Napas 247
   */
  async getSupportedBanks(_req: Request, res: Response, next: NextFunction) {
    try {
      const banks = campaignService.getSupportedBanks();
      return sendSuccess(res, 200, "Lấy danh sách ngân hàng hợp lệ thành công", banks);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [POST /api/v1/campaigns/lookup-bank-account] Tra cứu tài khoản ngân hàng liên ngân hàng
   */
  async lookupBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await campaignService.lookupBankAccount(req.body);
      return sendSuccess(res, 200, "Tra cứu thông tin tài khoản thành công", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [POST /api/v1/campaigns/:id/closure-request] Chủ chiến dịch gửi đơn yêu cầu đóng chiến dịch sớm
   */
  async requestClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const campaignId = String(req.params.id);
      const actorId = (req as any).user.userId;
      const result = await campaignService.requestClosure(campaignId, actorId, req.body);
      return sendSuccess(res, 200, result.message, result.closureRequest);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [GET /api/v1/campaigns/admin/closure-requests] Admin lấy danh sách yêu cầu đóng chiến dịch sớm
   */
  async getAdminClosureRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string | undefined;
      const result = await campaignService.getAdminClosureRequests({ status, page, limit });
      return sendSuccess(res, 200, "Lấy danh sách yêu cầu đóng chiến dịch sớm thành công", result.items, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [PATCH /api/v1/campaigns/admin/closure-requests/:id/review] Admin phê duyệt hoặc từ chối yêu cầu đóng sớm
   */
  async reviewClosureRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const campaignId = String(req.params.id);
      const adminId = (req as any).user.userId;
      const result = await campaignService.reviewClosureRequest(campaignId, adminId, req.body);
      return sendSuccess(res, 200, result.message, result);
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
