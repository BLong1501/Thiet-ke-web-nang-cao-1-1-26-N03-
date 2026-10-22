import { auditService } from "../../core/services/audit.service";
import { campaignRepository, CampaignRepository } from "./campaign.repository";
import {
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignQueryInput,
  ReviewCampaignInput,
  AddMediaInput,
  CreateUpdateInput,
  CategoryInput,
  CreateDisbursementInput,
  ReviewDisbursementInput,
  LookupBankAccountInput,
} from "./campaign.validation";
import { findBank, NAPAS_BANKS } from "../../core/constants/banks.constant";

import { generateUniqueSlug, slugify } from "../../core/utils/slug.util";
import { AppError } from "../../core/errors/app.error";
import { CampaignStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../core/database/prisma";
import {
  campaignCacheKeys,
  CampaignCacheTTL,
  invalidatePublicCampaignCache,
  readCampaignCache,
  writeCampaignCache,
  type CacheStatus,
} from "../../core/cache/campaign-cache";
import {
  assertObjectAccess,
  canSeeUnpublishedCampaign,
  isAdmin,
  PUBLIC_CAMPAIGN_STATUSES,
  type Actor,
} from "../../core/auth/object-access";

function normalizeVietnamese(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .trim();
}

export class CampaignService {
  constructor(private repo: CampaignRepository = campaignRepository) {}

  /**
   * Tính toán các chỉ số bổ sung: % tiến độ, số ngày còn lại, đã kết thúc chưa.
   * Không truy vấn CSDL — số dư sổ cái được truyền vào từ hydrateCampaigns.
   */
  private formatCampaign(
    campaign: any,
    currentAmount: number,
    options: { includeSensitive?: boolean } = {}
  ) {
    if (!campaign) return null;

    const target = Number(campaign.targetAmount);
    const current = Number(currentAmount);
    const rawProgress = target > 0 ? (current / target) * 100 : 0;
    const progressPercentage =
      rawProgress > 0 && rawProgress < 1
        ? Number(rawProgress.toFixed(1))
        : Math.min(100, Math.round(rawProgress));
    const now = new Date();
    const end = new Date(campaign.endDate);
    const diffTime = end.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const isEnded = now > end || campaign.status === CampaignStatus.COMPLETED;

    let legalMetadata: any = null;
    if (campaign.beneficiaryInfo) {
      try {
        legalMetadata = JSON.parse(campaign.beneficiaryInfo);
      } catch {
        legalMetadata = { details: campaign.beneficiaryInfo };
      }
    }

    const isEdited = Boolean(
      legalMetadata?.isEdited ||
      (campaign.updatedAt && campaign.createdAt && new Date(campaign.updatedAt).getTime() - new Date(campaign.createdAt).getTime() > 10000)
    );

    const includeSensitive = options.includeSensitive === true;
    return {
      ...campaign,
      targetAmount: target,
      currentAmount: current,
      progressPercentage,
      daysLeft,
      isEnded,
      isEdited,
      lastEditedAt: legalMetadata?.lastEditedAt || (isEdited ? campaign.updatedAt : null),
      organizerType: legalMetadata?.organizerType || "INDIVIDUAL",
      organizationName: legalMetadata?.organizationName || null,
      taxCode: includeSensitive ? legalMetadata?.taxCode || null : null,
      representativeRole: legalMetadata?.representativeRole || null,
      charityCommitment: legalMetadata?.charityCommitmentAccepted
        ? {
            isAccepted: true,
            acceptedAt: legalMetadata.charityCommitmentAcceptedAt,
            statement: legalMetadata.charityCommitmentStatement,
          }
        : null,
      communityLink: legalMetadata?.communityLink || null,
      beneficiaryDetails: legalMetadata?.details || campaign.beneficiaryInfo,
      bankAccountNumber: campaign.bankAccountNumber,
      bankName: campaign.bankName,
      bankAccountName: campaign.bankAccountName,
    };
  }

  /**
   * Một lần đọc sổ cái cho cả trang, thay cho N truy vấn lặp trong formatCampaign.
   */
  private async hydrateCampaigns(
    campaigns: any[],
    options: { includeSensitive?: boolean } = {}
  ) {
    if (campaigns.length === 0) return [];
    const ids = campaigns.map((item) => item.id);
    const nets = await this.repo.findLedgerNetByCampaignIds(ids);
    return campaigns.map((item) => {
      const netFromLedger = nets.get(item.id);
      const activeAmount = Math.max(
        netFromLedger ?? 0,
        Number(item.currentAmount || 0)
      );
      return this.formatCampaign(item, activeAmount, options);
    });
  }

  private async hydrateCampaign(campaign: any, options: { includeSensitive?: boolean } = {}) {
    const [formatted] = await this.hydrateCampaigns([campaign], options);
    return formatted;
  }

  /**
   * Lấy danh sách chiến dịch công khai có phân trang, tìm kiếm và lọc
   */
  async getCampaigns(
    query: CampaignQueryInput,
    viewer?: Actor | null
  ): Promise<{
    items: any[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    cacheStatus: CacheStatus;
  }> {
    const requestedStatus = query.status;
    if (!isAdmin(viewer) && requestedStatus && !PUBLIC_CAMPAIGN_STATUSES.has(requestedStatus)) {
      throw new AppError("Không được lọc trạng thái nội bộ trên API công khai", 403);
    }

    const publicQuery = {
      ...query,
      status: isAdmin(viewer) ? requestedStatus : requestedStatus || CampaignStatus.ACTIVE,
    };
    const usePublicCache = !isAdmin(viewer);
    const cacheKey = campaignCacheKeys.list(publicQuery);
    if (usePublicCache) {
      const cached = await readCampaignCache<{
        items: any[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(cacheKey);
      if (cached) {
        return { ...cached, cacheStatus: "HIT" };
      }
    }

    const { page, limit, categoryId, search, status, sortBy } = publicQuery;
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

    const payload = {
      items: await this.hydrateCampaigns(items, { includeSensitive: isAdmin(viewer) }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    if (usePublicCache) {
      await writeCampaignCache(cacheKey, payload, CampaignCacheTTL.list);
    }
    return { ...payload, cacheStatus: "MISS" };
  }

  /**
   * Xem chi tiết chiến dịch theo ID hoặc Slug
   */
  async getCampaignDetail(
    idOrSlug: string,
    viewer?: Actor | null
  ): Promise<{ campaign: any; cacheStatus: CacheStatus }> {
    const cacheKey = campaignCacheKeys.detail(idOrSlug);
    const cached = await readCampaignCache<any>(cacheKey);
    if (cached && PUBLIC_CAMPAIGN_STATUSES.has(cached.status)) {
      const ownerView = canSeeUnpublishedCampaign(viewer, cached.fundraiserId);
      if (!ownerView) {
        return { campaign: cached, cacheStatus: "HIT" };
      }
    }

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

    const privileged = canSeeUnpublishedCampaign(viewer, campaign.fundraiserId);
    if (!PUBLIC_CAMPAIGN_STATUSES.has(campaign.status) && !privileged) {
      throw new AppError("Chiến dịch không tồn tại hoặc đã bị xóa", 404);
    }

    const formatted = await this.hydrateCampaign(campaign, { includeSensitive: privileged });
    if (!privileged) {
      await writeCampaignCache(cacheKey, formatted, CampaignCacheTTL.detail);
      await writeCampaignCache(campaignCacheKeys.detail(campaign.id), formatted, CampaignCacheTTL.detail);
      await writeCampaignCache(campaignCacheKeys.detail(campaign.slug), formatted, CampaignCacheTTL.detail);
    }
    return { campaign: formatted, cacheStatus: "MISS" };
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
      items: await this.hydrateCampaigns(items, { includeSensitive: true }),
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

    // 2. Kiểm tra cam kết minh bạch gây quỹ từ thiện (Bắt buộc)
    if (!input.charityCommitmentAccepted) {
      throw new AppError(
        "Bạn bắt buộc phải đọc và tích cam kết minh bạch gây quỹ từ thiện, đảm bảo tài khoản nhận tiền chỉ phục vụ mục đích từ thiện theo quy định pháp luật.",
        400
      );
    }

    // 3. Lấy thông tin người gây quỹ để kiểm tra đối soát tài khoản ngân hàng
    const fundraiser = await prisma.user.findUnique({
      where: { id: fundraiserId },
      select: { id: true, fullName: true, role: true },
    });

    const organizerType = input.organizerType || "INDIVIDUAL";
    const normalizedBankName = normalizeVietnamese(input.bankAccountName || "");
    const normalizedFundraiserName = normalizeVietnamese(fundraiser?.fullName || "");

    // 4. Ràng buộc theo loại chủ thể
    if (organizerType === "INDIVIDUAL") {
      // Đối với cá nhân: Tên chủ tài khoản ngân hàng phải trùng khớp với họ tên người gây quỹ (định danh CCCD)
      if (normalizedFundraiserName && normalizedFundraiserName !== normalizedBankName) {
        throw new AppError(
          `Tên chủ tài khoản ngân hàng (${input.bankAccountName}) không trùng khớp với họ tên đã định danh của bạn (${fundraiser?.fullName}). Đối với chiến dịch do cá nhân phát động, tài khoản ngân hàng phải đứng tên chính bạn để bảo đảm tính minh bạch.`,
          400
        );
      }
    } else if (organizerType === "ORGANIZATION") {
      // Đối với tổ chức: Tài khoản nhận tiền phải là tài khoản của Tổ chức/Pháp nhân, KHÔNG được dùng tài khoản cá nhân của người đại diện
      if (normalizedFundraiserName && normalizedFundraiserName === normalizedBankName) {
        throw new AppError(
          "Đối với chiến dịch do Doanh nghiệp / Tổ chức phát động, tài khoản nhận tiền bắt buộc phải là tài khoản ngân hàng của Pháp nhân, không được sử dụng tài khoản cá nhân của người đại diện.",
          400
        );
      }
    }

    // 5. Kiểm tra danh mục hợp lệ
    const category = await this.repo.findCategoryById(input.categoryId);
    if (!category || !category.isActive) {
      throw new AppError("Danh mục chiến dịch không tồn tại hoặc đang tạm ngưng", 400);
    }

    // 6. Kiểm tra ngày kết thúc phải lớn hơn ngày bắt đầu
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const endDate = new Date(input.endDate);
    if (endDate <= startDate) {
      throw new AppError("Ngày kết thúc gây quỹ phải diễn ra sau ngày bắt đầu", 400);
    }

    // 7. Sinh slug chuẩn SEO duy nhất
    const slug = generateUniqueSlug(input.title);

    // 8. Lưu vào Database
    const campaign = await this.repo.create(fundraiserId, slug, input);
    await invalidatePublicCampaignCache();

    // 9. Ghi AuditLog bảo mật hành vi khởi tạo chiến dịch
    await auditService.log({
        userId: fundraiserId,
        action: "CREATE_CAMPAIGN",
        entityName: "Campaign",
        entityId: campaign.id,
      });

    return this.hydrateCampaign(campaign, { includeSensitive: true });
  }

  /**
   * Chỉnh sửa chiến dịch (Chống IDOR - Chỉ chủ sở hữu mới được sửa)
   */
  async updateCampaign(userId: string, userRole: string, campaignId: string, input: UpdateCampaignInput) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) {
      throw new AppError("Chiến dịch không tồn tại", 404);
    }

    await assertObjectAccess({
      actor: { userId, role: userRole },
      ownerId: campaign.fundraiserId,
      entityName: "Campaign",
      entityId: campaignId,
      message: "Bạn không có quyền chỉnh sửa chiến dịch này",
    });

    // Không cho phép sửa nếu chiến dịch đã hoàn thành hoặc đã bị hủy
    if (
      userRole !== UserRole.ADMIN &&
      (campaign.status === CampaignStatus.COMPLETED ||
        campaign.status === CampaignStatus.CANCELLED)
    ) {
      throw new AppError(
        "Không thể chỉnh sửa chiến dịch đã hoàn tất hoặc đã bị hủy.",
        400
      );
    }

    // Nếu người sửa là chủ chiến dịch (Fundraiser), tự động chuyển trạng thái về PENDING_APPROVAL để Admin duyệt lại
    if (userRole !== UserRole.ADMIN) {
      input.status = CampaignStatus.PENDING_APPROVAL;
    }

    // Nếu có đổi danh mục, kiểm tra danh mục mới
    if (input.categoryId) {
      const category = await this.repo.findCategoryById(input.categoryId);
      if (!category || !category.isActive) {
        throw new AppError("Danh mục chiến dịch không hợp lệ", 400);
      }
    }

    const updated = await this.repo.update(campaignId, input);

    // Ghi AuditLog
    await auditService.log({
      userId,
      action: "UPDATE_CAMPAIGN",
      entityName: "Campaign",
      entityId: campaignId,
    });

    // Thông báo cho ban quản trị biết chiến dịch cần duyệt lại
    if (userRole !== UserRole.ADMIN) {
      try {
        const admins = await prisma.user.findMany({
          where: { role: UserRole.ADMIN, status: "ACTIVE" },
          select: { id: true },
        });
        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "Chiến dịch cần duyệt lại thông tin",
              message: `Chủ chiến dịch "${campaign.title}" vừa chỉnh sửa nội dung/hình ảnh và gửi yêu cầu phê duyệt lại.`,
              type: "CAMPAIGN",
              linkUrl: `/admin/campaigns`,
            },
          });
        }
      } catch (err) {
        console.warn("[UPDATE_CAMPAIGN_NOTIFICATION_WARN]:", err);
      }
    }

    await invalidatePublicCampaignCache();
    return this.hydrateCampaign(updated, { includeSensitive: true });
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
      items: await this.hydrateCampaigns(items, { includeSensitive: true }),
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
      let existingMetadata: any = {};
      if (campaign.beneficiaryInfo) {
        try {
          existingMetadata = JSON.parse(campaign.beneficiaryInfo);
        } catch {
          existingMetadata = { details: campaign.beneficiaryInfo };
        }
      }
      existingMetadata.isEdited = false;

      const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: input.status,
          beneficiaryInfo: JSON.stringify(existingMetadata),
        },
      });

      // Ghi vết kiểm toán (AuditLog)
      await auditService.write({
          userId: adminId,
          action: input.status === CampaignStatus.ACTIVE ? "APPROVE_CAMPAIGN" : "REJECT_CAMPAIGN",
          entityName: "Campaign",
          entityId: campaignId,
        }, tx);

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

    await invalidatePublicCampaignCache();

    return {
      message:
        input.status === CampaignStatus.ACTIVE
          ? "Phê duyệt chiến dịch thành công"
          : "Từ chối chiến dịch thành công",
      campaign: await this.hydrateCampaign(result, { includeSensitive: true }),
    };
  }

  /**
   * Thêm media minh chứng (Ảnh/Video)
   */
  async addMedia(userId: string, userRole: string, campaignId: string, input: AddMediaInput) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError("Chiến dịch không tồn tại", 404);

    await assertObjectAccess({
      actor: { userId, role: userRole },
      ownerId: campaign.fundraiserId,
      entityName: "Campaign",
      entityId: campaignId,
      message: "Bạn không có quyền quản lý tài nguyên của chiến dịch này",
    });

    const media = await this.repo.addMedia(campaignId, input);
    await invalidatePublicCampaignCache();
    return media;
  }

  /**
   * Đăng nhật ký tiến độ gây quỹ
   */
  async addUpdate(userId: string, userRole: string, campaignId: string, input: CreateUpdateInput) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError("Chiến dịch không tồn tại", 404);

    await assertObjectAccess({
      actor: { userId, role: userRole },
      ownerId: campaign.fundraiserId,
      entityName: "Campaign",
      entityId: campaignId,
      message: "Chỉ chủ chiến dịch mới có quyền đăng nhật ký cập nhật tiến độ",
    });

    const update = await this.repo.addUpdate(campaignId, input);
    await invalidatePublicCampaignCache();
    return update;
  }

  /**
   * Đăng chứng từ minh chứng giải ngân minh bạch
   */
  async addDisbursement(
    userId: string,
    userRole: string,
    campaignId: string,
    input: CreateDisbursementInput
  ) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError("Chiến dịch không tồn tại", 404);

    await assertObjectAccess({
      actor: { userId, role: userRole },
      ownerId: campaign.fundraiserId,
      entityName: "Campaign",
      entityId: campaignId,
      message: "Chỉ chủ chiến dịch mới có quyền cập nhật thông tin giải ngân",
    });

    const disbursement = await this.repo.addDisbursement(campaignId, userId, input);

    // Ghi AuditLog
    await auditService.log({
        userId,
        action: "CREATE_DISBURSEMENT",
        entityName: "Disbursement",
        entityId: disbursement.id,
      });

    await invalidatePublicCampaignCache();
    return disbursement;
  }

  /**
   * Admin lấy danh sách toàn bộ các khoản giải ngân và chứng từ
   */
  async getAdminDisbursements(page: number = 1, limit: number = 10) {
    return this.repo.findDisbursements(page, limit);
  }

  /**
   * Admin phê duyệt hoặc từ chối hồ sơ giải ngân
   */
  async reviewDisbursement(
    adminId: string,
    disbursementId: string,
    input: ReviewDisbursementInput
  ) {
    const disbursement = await this.repo.findDisbursementById(disbursementId);
    if (!disbursement) throw new AppError("Hồ sơ giải ngân không tồn tại", 404);

    const updated = await this.repo.reviewDisbursement(disbursementId, input, adminId);

    // Ghi Audit Log
    await auditService.log({
        userId: adminId,
        action: input.status === "APPROVED" ? "APPROVE_DISBURSEMENT" : "REJECT_DISBURSEMENT",
        entityName: "Disbursement",
        entityId: disbursementId,
      });

    // Tạo thông báo cho người lập hồ sơ giải ngân
    try {
      await prisma.notification.create({
        data: {
          userId: disbursement.createdBy,
          title: input.status === "APPROVED" ? "Hồ sơ giải ngân đã được phê duyệt" : "Hồ sơ giải ngân bị từ chối",
          message: input.status === "APPROVED"
            ? `Khoản giải ngân "${disbursement.title}" trị giá ${Number(disbursement.amount).toLocaleString("vi-VN")} đ đã được Admin phê duyệt thành công.`
            : `Hồ sơ giải ngân "${disbursement.title}" bị từ chối. Lý do: ${input.rejectionReason || "Chưa đạt yêu cầu chứng từ/đối soát tài khoản."}`,
          type: "SYSTEM",
        },
      });
    } catch {
      // Bỏ qua nếu lỗi tạo notification phụ
    }

    await invalidatePublicCampaignCache();
    return updated;
  }


  // ==========================================
  // CATEGORIES SERVICES
  // ==========================================

  async getCategories(isActiveOnly: boolean = true): Promise<{ categories: any; cacheStatus: CacheStatus }> {
    const cacheKey = campaignCacheKeys.categories(isActiveOnly);
    const cached = await readCampaignCache<any>(cacheKey);
    if (cached) {
      return { categories: cached, cacheStatus: "HIT" };
    }
    const categories = await this.repo.findAllCategories(isActiveOnly);
    await writeCampaignCache(cacheKey, categories, CampaignCacheTTL.categories);
    return { categories, cacheStatus: "MISS" };
  }

  async createCategory(input: CategoryInput) {
    const slug = input.slug || slugify(input.name);
    const existing = await this.repo.findCategoryBySlug(slug);
    if (existing) {
      throw new AppError("Slug danh mục đã tồn tại, vui lòng chọn tên khác", 400);
    }

    const category = await this.repo.createCategory({ ...input, slug });
    await invalidatePublicCampaignCache();
    return category;
  }

  async updateCategory(id: string, input: Partial<CategoryInput>) {
    const category = await this.repo.findCategoryById(id);
    if (!category) throw new AppError("Danh mục không tồn tại", 404);

    if (input.name && !input.slug) {
      input.slug = slugify(input.name);
    }

    const updated = await this.repo.updateCategory(id, input);
    await invalidatePublicCampaignCache();
    return updated;
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
    await invalidatePublicCampaignCache();
    return { message: "Xóa danh mục thành công" };
  }

  /**
   * Lấy danh sách trắng các ngân hàng Napas 247 được hỗ trợ
   */
  getSupportedBanks() {
    return NAPAS_BANKS;
  }

  /**
   * Tra cứu tài khoản ngân hàng liên ngân hàng (VietQR / Napas 247)
   */
  async lookupBankAccount(input: LookupBankAccountInput) {
    const bank = findBank(input.bankCode);
    if (!bank) {
      throw new AppError("Ngân hàng không nằm trong danh sách hệ thống thanh toán Napas 247", 400);
    }

    const clientId = process.env.VIETQR_CLIENT_ID;
    const apiKey = process.env.VIETQR_API_KEY;

    if (clientId && apiKey) {
      try {
        const response = await fetch("https://api.vietqr.io/v2/lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": clientId,
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            bin: bank.bin,
            accountNumber: input.accountNumber,
          }),
        });
        const data: any = await response.json();
        if (data.code === "00" && data.data?.accountName) {
          return {
            bank,
            accountNumber: input.accountNumber,
            accountName: data.data.accountName,
            verified: true,
            source: "VIETQR_NAPAS",
          };
        } else {
          throw new AppError(data.desc || "Không tìm thấy thông tin tài khoản tại ngân hàng này", 400);
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError("Không thể kết nối tới cổng tra cứu liên ngân hàng Napas 247: " + err.message, 502);
      }
    }

    // Chế độ mô phỏng / Development (khi chưa cấu hình VIETQR_API_KEY đối tác)
    return {
      bank,
      accountNumber: input.accountNumber,
      accountName: null,
      verified: false,
      source: "LOCAL_VALIDATED",
      message: `Đã xác thực định dạng số tài khoản và ngân hàng ${bank.shortName} (${bank.name}) thuộc mạng lưới Napas 247. Vui lòng nhập tên chủ tài khoản in hoa không dấu để hệ thống đối chiếu với CCCD.`,
    };
  }
}

export const campaignService = new CampaignService();
