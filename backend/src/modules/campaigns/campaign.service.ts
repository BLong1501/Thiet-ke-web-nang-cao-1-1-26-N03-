import { campaignRepository, CampaignRepository } from "./campaign.repository";
import {
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignQueryInput,
  ReviewCampaignInput,
  AddMediaInput,
  CreateUpdateInput,
  CategoryInput,
} from "./campaign.validation";
import { generateUniqueSlug, slugify } from "../../core/utils/slug.util";
import { AppError } from "../../core/errors/app.error";
import { CampaignStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../core/database/prisma";

export class CampaignService {
  constructor(private repo: CampaignRepository = campaignRepository) {}

  /**
   * Tính toán các chỉ số bổ sung: % tiến độ, số ngày còn lại, đã kết thúc chưa
   */
  private formatCampaign(campaign: any) {
    if (!campaign) return null;

    const target = Number(campaign.targetAmount);
    const current = Number(campaign.currentAmount);
    const progressPercentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const now = new Date();
    const end = new Date(campaign.endDate);
    const diffTime = end.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const isEnded = now > end || campaign.status === CampaignStatus.COMPLETED;

    return {
      ...campaign,
      targetAmount: target,
      currentAmount: current,
      progressPercentage,
      daysLeft,
      isEnded,
    };
  }

  /**
   * Lấy danh sách chiến dịch công khai có phân trang, tìm kiếm và lọc
   */
  async getCampaigns(query: CampaignQueryInput) {
    const { page, limit, categoryId, search, status, sortBy } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignWhereInput = {
      status: status || CampaignStatus.ACTIVE,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { shortDescription: { contains: search } },
        ],
      }),
    };

    let orderBy: Prisma.CampaignOrderByWithRelationInput = { createdAt: "desc" };
    if (sortBy === "most_funded") {
      orderBy = { currentAmount: "desc" };
    } else if (sortBy === "ending_soon") {
      orderBy = { endDate: "asc" };
    } else if (sortBy === "target_amount") {
      orderBy = { targetAmount: "desc" };
    }

    const [items, total] = await Promise.all([
      this.repo.findCampaigns(where, orderBy, skip, limit),
      this.repo.countCampaigns(where),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((item) => this.formatCampaign(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Xem chi tiết chiến dịch theo ID hoặc Slug
   */
  async getCampaignDetail(idOrSlug: string) {
    let campaign = null;

    // Kiểm tra nếu là UUID format thì tìm theo ID trước
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      campaign = await this.repo.findById(idOrSlug);
    }

    if (!campaign) {
      campaign = await this.repo.findBySlug(idOrSlug);
    }

    if (!campaign) {
      throw new AppError("Chiến dịch không tồn tại hoặc đã bị xóa", 404);
    }

    return this.formatCampaign(campaign);
  }

  /**
   * Lấy danh sách chiến dịch của chính Fundraiser đang đăng nhập
   */
  async getMyCampaigns(fundraiserId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where: Prisma.CampaignWhereInput = { fundraiserId };

    const [items, total] = await Promise.all([
      this.repo.findCampaigns(where, { createdAt: "desc" }, skip, limit),
      this.repo.countCampaigns(where),
    ]);

    return {
      items: items.map((item) => this.formatCampaign(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Khởi tạo chiến dịch gây quỹ mới
   */
  async createCampaign(fundraiserId: string, userRole: string, input: CreateCampaignInput) {
    // 1. Kiểm tra vai trò: Phải là FUNDRAISER hoặc ADMIN
    if (userRole !== UserRole.FUNDRAISER && userRole !== UserRole.ADMIN) {
      throw new AppError(
        "Bạn cần hoàn tất hồ sơ xác minh danh tính (KYC) và được phê duyệt để có quyền khởi tạo chiến dịch gây quỹ",
        403
      );
    }

    // 2. Kiểm tra danh mục hợp lệ
    const category = await this.repo.findCategoryById(input.categoryId);
    if (!category || !category.isActive) {
      throw new AppError("Danh mục chiến dịch không tồn tại hoặc đang tạm ngưng", 400);
    }

    // 3. Kiểm tra ngày kết thúc phải lớn hơn ngày bắt đầu
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const endDate = new Date(input.endDate);
    if (endDate <= startDate) {
      throw new AppError("Ngày kết thúc gây quỹ phải diễn ra sau ngày bắt đầu", 400);
    }

    // 4. Sinh slug chuẩn SEO duy nhất
    const slug = generateUniqueSlug(input.title);

    // 5. Lưu vào Database
    const campaign = await this.repo.create(fundraiserId, slug, input);

    return this.formatCampaign(campaign);
  }

  /**
   * Chỉnh sửa chiến dịch (Chống IDOR - Chỉ chủ sở hữu mới được sửa)
   */
  async updateCampaign(userId: string, userRole: string, campaignId: string, input: UpdateCampaignInput) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) {
      throw new AppError("Chiến dịch không tồn tại", 404);
    }

    // Kiểm tra quyền sở hữu (chống IDOR)
    if (userRole !== UserRole.ADMIN && campaign.fundraiserId !== userId) {
      throw new AppError("Bạn không có quyền chỉnh sửa chiến dịch này", 403);
    }

    // Chỉ cho phép sửa khi chiến dịch đang ở trạng thái DRAFT hoặc PENDING_APPROVAL
    if (
      userRole !== UserRole.ADMIN &&
      campaign.status !== CampaignStatus.DRAFT &&
      campaign.status !== CampaignStatus.PENDING_APPROVAL
    ) {
      throw new AppError(
        "Không thể chỉnh sửa chiến dịch đã được kích hoạt hoặc đã kết thúc. Vui lòng liên hệ ban quản trị.",
        400
      );
    }

    // Nếu có đổi danh mục, kiểm tra danh mục mới
    if (input.categoryId) {
      const category = await this.repo.findCategoryById(input.categoryId);
      if (!category || !category.isActive) {
        throw new AppError("Danh mục chiến dịch không hợp lệ", 400);
      }
    }

    const updated = await this.repo.update(campaignId, input);
    return this.formatCampaign(updated);
  }

  /**
   * Danh sách chiến dịch chờ duyệt (Dành cho Admin)
   */
  async getPendingCampaigns(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where: Prisma.CampaignWhereInput = {
      status: CampaignStatus.PENDING_APPROVAL,
    };

    const [items, total] = await Promise.all([
      this.repo.findCampaigns(where, { createdAt: "asc" }, skip, limit),
      this.repo.countCampaigns(where),
    ]);

    return {
      items: items.map((item) => this.formatCampaign(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin duyệt hoặc từ chối chiến dịch
   */
  async reviewCampaign(adminId: string, campaignId: string, input: ReviewCampaignInput) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) {
      throw new AppError("Chiến dịch không tồn tại", 404);
    }

    if (campaign.status !== CampaignStatus.PENDING_APPROVAL) {
      throw new AppError("Chiến dịch này không nằm trong danh sách chờ duyệt", 400);
    }

    // Thực hiện trong Prisma Transaction: Cập nhật status + Ghi AuditLog + Tạo Notification
    const result = await prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: { status: input.status },
      });

      // Ghi vết kiểm toán (AuditLog)
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: input.status === CampaignStatus.ACTIVE ? "APPROVE_CAMPAIGN" : "REJECT_CAMPAIGN",
          entityName: "Campaign",
          entityId: campaignId,
          details: {
            result: input.status,
            rejectionReason: input.rejectionReason || null,
          },
        },
      });

      // Tạo thông báo cho chủ chiến dịch
      await tx.notification.create({
        data: {
          userId: campaign.fundraiserId,
          title:
            input.status === CampaignStatus.ACTIVE
              ? "Chiến dịch của bạn đã được phê duyệt!"
              : "Chiến dịch của bạn đã bị từ chối",
          message:
            input.status === CampaignStatus.ACTIVE
              ? `Chiến dịch "${campaign.title}" đã chính thức được kích hoạt và mở nhận quyên góp.`
              : `Chiến dịch "${campaign.title}" không được duyệt. Lý do: ${input.rejectionReason}`,
          type: input.status === CampaignStatus.ACTIVE ? "CAMPAIGN_APPROVED" : "CAMPAIGN_REJECTED",
          linkUrl: `/campaigns/${campaign.slug}`,
        },
      });

      return updatedCampaign;
    });

    return {
      message:
        input.status === CampaignStatus.ACTIVE
          ? "Phê duyệt chiến dịch thành công"
          : "Từ chối chiến dịch thành công",
      campaign: this.formatCampaign(result),
    };
  }

  /**
   * Thêm media minh chứng (Ảnh/Video)
   */
  async addMedia(userId: string, userRole: string, campaignId: string, input: AddMediaInput) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError("Chiến dịch không tồn tại", 404);

    if (userRole !== UserRole.ADMIN && campaign.fundraiserId !== userId) {
      throw new AppError("Bạn không có quyền quản lý tài nguyên của chiến dịch này", 403);
    }

    return this.repo.addMedia(campaignId, input);
  }

  /**
   * Đăng nhật ký tiến độ gây quỹ
   */
  async addUpdate(userId: string, userRole: string, campaignId: string, input: CreateUpdateInput) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError("Chiến dịch không tồn tại", 404);

    if (userRole !== UserRole.ADMIN && campaign.fundraiserId !== userId) {
      throw new AppError("Chỉ chủ chiến dịch mới có quyền đăng nhật ký cập nhật tiến độ", 403);
    }

    return this.repo.addUpdate(campaignId, input);
  }

  // ==========================================
  // CATEGORIES SERVICES
  // ==========================================

  async getCategories(isActiveOnly: boolean = true) {
    return this.repo.findAllCategories(isActiveOnly);
  }

  async createCategory(input: CategoryInput) {
    const slug = input.slug || slugify(input.name);
    const existing = await this.repo.findCategoryBySlug(slug);
    if (existing) {
      throw new AppError("Slug danh mục đã tồn tại, vui lòng chọn tên khác", 400);
    }

    return this.repo.createCategory({ ...input, slug });
  }

  async updateCategory(id: string, input: Partial<CategoryInput>) {
    const category = await this.repo.findCategoryById(id);
    if (!category) throw new AppError("Danh mục không tồn tại", 404);

    if (input.name && !input.slug) {
      input.slug = slugify(input.name);
    }

    return this.repo.updateCategory(id, input);
  }

  async deleteCategory(id: string) {
    const category = await this.repo.findCategoryById(id);
    if (!category) throw new AppError("Danh mục không tồn tại", 404);

    // Kiểm tra xem danh mục có chiến dịch nào chưa
    const campaignCount = await this.repo.countCampaigns({ categoryId: id });
    if (campaignCount > 0) {
      throw new AppError(
        `Không thể xóa danh mục vì đang có ${campaignCount} chiến dịch thuộc danh mục này`,
        400
      );
    }

    await this.repo.deleteCategory(id);
    return { message: "Xóa danh mục thành công" };
  }
}

export const campaignService = new CampaignService();
