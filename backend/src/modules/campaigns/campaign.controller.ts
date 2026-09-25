import { Request, Response, NextFunction } from "express";
import { campaignService } from "./campaign.service";
import { sendSuccess, sendCreated } from "../../core/utils/response.util";
import { CampaignQueryInput } from "./campaign.validation";

export class CampaignController {
  /**
   * [GET /api/v1/campaigns] Danh sách chiến dịch công khai
   */
  async getCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as CampaignQueryInput;
      const result = await campaignService.getCampaigns(query);
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
      const campaign = await campaignService.getCampaignDetail(idOrSlug);
      return sendSuccess(res, 200, "Lấy thông tin chi tiết chiến dịch thành công", campaign);
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
      return sendCreated(res, "Đăng nhật ký cập nhật tiến độ thành công", update);
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
      const categories = await campaignService.getCategories(isActiveOnly);
      return sendSuccess(res, 200, "Lấy danh mục thành công", categories);
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
      return sendSuccess(res, 200, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
