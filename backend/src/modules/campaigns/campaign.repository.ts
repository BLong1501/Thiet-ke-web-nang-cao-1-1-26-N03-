import { prisma } from "../../core/database/prisma";
import { CampaignStatus, Prisma } from "@prisma/client";
import { CreateCampaignInput, UpdateCampaignInput, AddMediaInput, CreateUpdateInput, CategoryInput } from "./campaign.validation";

export class CampaignRepository {
  /**
   * Lấy danh sách chiến dịch có phân trang, lọc và sắp xếp
   */
  async findCampaigns(
    where: Prisma.CampaignWhereInput,
    orderBy: Prisma.CampaignOrderByWithRelationInput,
    skip: number,
    take: number
  ) {
    return prisma.campaign.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        fundraiser: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            donations: true,
            updates: true,
          },
        },
      },
    });
  }

  /**
   * Đếm tổng số chiến dịch thỏa mãn bộ lọc
   */
  async countCampaigns(where: Prisma.CampaignWhereInput): Promise<number> {
    return prisma.campaign.count({ where });
  }

  /**
   * Tìm chiến dịch theo ID (kèm chi tiết ảnh, cập nhật và các khoản ủng hộ gần nhất)
   */
  async findById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        category: true,
        fundraiser: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
          },
        },
        media: {
          orderBy: { sortOrder: "asc" },
        },
        updates: {
          orderBy: { createdAt: "desc" },
        },
        donations: {
          where: { paymentStatus: "SUCCESS" },
          orderBy: { paidAt: "desc" },
          take: 10,
          select: {
            id: true,
            amount: true,
            donorName: true,
            isAnonymous: true,
            message: true,
            paidAt: true,
          },
        },
        disbursements: {
          orderBy: { disbursementDate: "desc" },
          select: {
            id: true,
            title: true,
            amount: true,
            disbursementDate: true,
            proofDocuments: true,
            note: true,
          },
        },
      },
    });
  }

  /**
   * Tìm chiến dịch theo Slug
   */
  async findBySlug(slug: string) {
    return prisma.campaign.findUnique({
      where: { slug },
      include: {
        category: true,
        fundraiser: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
          },
        },
        media: {
          orderBy: { sortOrder: "asc" },
        },
        updates: {
          orderBy: { createdAt: "desc" },
        },
        donations: {
          where: { paymentStatus: "SUCCESS" },
          orderBy: { paidAt: "desc" },
          take: 10,
          select: {
            id: true,
            amount: true,
            donorName: true,
            isAnonymous: true,
            message: true,
            paidAt: true,
          },
        },
        disbursements: {
          orderBy: { disbursementDate: "desc" },
          select: {
            id: true,
            title: true,
            amount: true,
            disbursementDate: true,
            proofDocuments: true,
            note: true,
          },
        },
      },
    });
  }

  /**
   * Tạo mới chiến dịch
   */
  async create(fundraiserId: string, slug: string, input: CreateCampaignInput) {
    const { media, ...campaignData } = input;

    return prisma.campaign.create({
      data: {
        ...campaignData,
        fundraiserId,
        slug,
        startDate: campaignData.startDate ? new Date(campaignData.startDate) : new Date(),
        endDate: new Date(campaignData.endDate),
        targetAmount: new Prisma.Decimal(campaignData.targetAmount),
        media: media && media.length > 0
          ? {
              create: media.map((m, index) => ({
                mediaType: m.mediaType,
                url: m.url,
                caption: m.caption,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        media: true,
      },
    });
  }

  /**
   * Cập nhật chiến dịch
   */
  async update(id: string, input: UpdateCampaignInput) {
    const data: Prisma.CampaignUpdateInput = {
      ...(input.title && { title: input.title }),
      ...(input.shortDescription && { shortDescription: input.shortDescription }),
      ...(input.story && { story: input.story }),
      ...(input.coverImageUrl && { coverImageUrl: input.coverImageUrl }),
      ...(input.targetAmount && { targetAmount: new Prisma.Decimal(input.targetAmount) }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate && { endDate: new Date(input.endDate) }),
      ...(input.bankAccountNumber && { bankAccountNumber: input.bankAccountNumber }),
      ...(input.bankName && { bankName: input.bankName }),
      ...(input.bankAccountName && { bankAccountName: input.bankAccountName }),
      ...(input.beneficiaryInfo !== undefined && { beneficiaryInfo: input.beneficiaryInfo }),
      ...(input.status && { status: input.status }),
      ...(input.categoryId && {
        category: {
          connect: { id: input.categoryId },
        },
      }),
    };

    return prisma.campaign.update({
      where: { id },
      data,
      include: {
        category: true,
        media: true,
      },
    });
  }

  /**
   * Cập nhật trạng thái chiến dịch (Admin duyệt / từ chối / đóng)
   */
  async updateStatus(id: string, status: CampaignStatus) {
    return prisma.campaign.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Thêm media minh chứng cho chiến dịch
   */
  async addMedia(campaignId: string, input: AddMediaInput) {
    const count = await prisma.campaignMedia.count({ where: { campaignId } });
    return prisma.campaignMedia.create({
      data: {
        campaignId,
        mediaType: input.mediaType,
        url: input.url,
        caption: input.caption,
        sortOrder: count,
      },
    });
  }

  /**
   * Fundraiser thêm nhật ký tiến độ
   */
  async addUpdate(campaignId: string, input: CreateUpdateInput) {
    return prisma.campaignUpdate.create({
      data: {
        campaignId,
        title: input.title,
        content: input.content,
        attachments: input.attachments ? (input.attachments as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  // ==========================================
  // CATEGORIES REPOSITORY METHODS
  // ==========================================

  async findAllCategories(isActiveOnly: boolean = false) {
    return prisma.category.findMany({
      where: isActiveOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            campaigns: {
              where: { status: CampaignStatus.ACTIVE },
            },
          },
        },
      },
    });
  }

  async findCategoryById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  }

  async findCategoryBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  }

  async createCategory(input: CategoryInput) {
    return prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug || input.name.toLowerCase().replace(/\s+/g, "-"),
        description: input.description,
        iconUrl: input.iconUrl,
        isActive: input.isActive,
      },
    });
  }

  async updateCategory(id: string, input: Partial<CategoryInput>) {
    return prisma.category.update({
      where: { id },
      data: input,
    });
  }

  async deleteCategory(id: string) {
    return prisma.category.delete({ where: { id } });
  }
}

export const campaignRepository = new CampaignRepository();
