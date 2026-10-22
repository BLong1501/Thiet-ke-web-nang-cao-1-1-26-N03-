import { prisma } from "../../core/database/prisma";
import { CampaignStatus, Prisma } from "@prisma/client";
import {
  CreateCampaignInput,
  UpdateCampaignInput,
  AddMediaInput,
  CreateUpdateInput,
  CategoryInput,
  CreateDisbursementInput,
  ReviewDisbursementInput,
} from "./campaign.validation";


function toAmount(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Gộp RECEIPT − REFUND theo từng chiến dịch.
 * Tách hàm thuần để kiểm thử không cần MySQL.
 */
export function sumLedgerRowsToNetMap(
  campaignIds: string[],
  rows: Array<{ campaignId: string; kind: string; total: unknown }>
): Map<string, number> {
  const receipts = new Map<string, number>();
  const refunds = new Map<string, number>();
  for (const id of campaignIds) {
    receipts.set(id, 0);
    refunds.set(id, 0);
  }
  for (const row of rows) {
    const amount = toAmount(row.total);
    if (row.kind === "RECEIPT") {
      receipts.set(row.campaignId, (receipts.get(row.campaignId) ?? 0) + amount);
    } else if (row.kind === "REFUND") {
      refunds.set(row.campaignId, (refunds.get(row.campaignId) ?? 0) + amount);
    }
  }
  const net = new Map<string, number>();
  for (const id of campaignIds) {
    net.set(id, (receipts.get(id) ?? 0) - (refunds.get(id) ?? 0));
  }
  return net;
}

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
   * Một lần đọc sổ cái cho cả trang (JOIN donations), thay cho N lần groupBy.
   * Cộng RECEIPT − REFUND trong bộ nhớ theo từng campaignId.
   */
  async findLedgerNetByCampaignIds(campaignIds: string[]): Promise<Map<string, number>> {
    if (campaignIds.length === 0) return new Map();

    const entries = await prisma.ledgerEntry.findMany({
      where: { donation: { campaignId: { in: campaignIds } } },
      select: {
        kind: true,
        amount: true,
        donation: { select: { campaignId: true } },
      },
    });

    const rows = entries.map((entry) => ({
      campaignId: entry.donation.campaignId,
      kind: entry.kind,
      total: entry.amount,
    }));

    return sumLedgerRowsToNetMap(campaignIds, rows);
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
            createdAt: true,
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
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Tạo mới chiến dịch
   */
  async create(fundraiserId: string, slug: string, input: CreateCampaignInput) {
    const {
      media,
      organizerType,
      organizationName,
      taxCode,
      representativeRole,
      charityCommitmentAccepted,
      beneficiaryInfo,
      ...campaignData
    } = input;

    // Đóng gói thông tin pháp lý & cam kết minh bạch vào trường beneficiaryInfo (JSON Text)
    const legalMetadata = {
      organizerType: organizerType || "INDIVIDUAL",
      organizationName: organizationName || null,
      taxCode: taxCode || null,
      representativeRole: representativeRole || null,
      charityCommitmentAccepted: true,
      charityCommitmentAcceptedAt: new Date().toISOString(),
      charityCommitmentStatement: "Cam kết tính minh bạch trong việc tạo chiến dịch, đại diện hợp pháp cho cơ quan tổ chức/cá nhân, đảm bảo tài khoản nhận tiền là tài khoản phục vụ việc từ thiện không có chi tiêu cá nhân hay khoản ngoài việc từ thiện theo quy định pháp luật.",
      details: beneficiaryInfo || null,
      momoPhone: (input as any).momoPhone || null,
      momoAccountName: (input as any).momoAccountName || null,
    };

    return prisma.campaign.create({
      data: {
        ...campaignData,
        beneficiaryInfo: JSON.stringify(legalMetadata),
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
    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { beneficiaryInfo: true },
    });
    let existingMetadata: any = {};
    if (existing?.beneficiaryInfo) {
      try {
        existingMetadata = JSON.parse(existing.beneficiaryInfo);
      } catch {
        existingMetadata = { details: existing.beneficiaryInfo };
      }
    }
    const serializedBeneficiaryInfo = JSON.stringify({
      ...existingMetadata,
      ...(input.organizerType !== undefined && { organizerType: input.organizerType }),
      ...(input.organizationName !== undefined && { organizationName: input.organizationName }),
      ...(input.taxCode !== undefined && { taxCode: input.taxCode }),
      ...(input.representativeRole !== undefined && { representativeRole: input.representativeRole }),
      ...(input.beneficiaryInfo !== undefined && { details: input.beneficiaryInfo }),
      ...((input as any).momoPhone !== undefined && { momoPhone: (input as any).momoPhone }),
      ...((input as any).momoAccountName !== undefined && { momoAccountName: (input as any).momoAccountName }),
      isEdited: true,
      lastEditedAt: new Date().toISOString(),
    });

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
      ...(serializedBeneficiaryInfo !== undefined && { beneficiaryInfo: serializedBeneficiaryInfo }),
      ...(input.status && { status: input.status }),
      ...(input.categoryId && {
        category: {
          connect: { id: input.categoryId },
        },
      }),
    };

    // Nếu có danh sách media cập nhật kèm theo
    if (Array.isArray(input.media)) {
      await prisma.$transaction(async (tx) => {
        await tx.campaignMedia.deleteMany({ where: { campaignId: id } });
        if (input.media && input.media.length > 0) {
          await tx.campaignMedia.createMany({
            data: input.media.map((m: any, idx: number) => ({
              campaignId: id,
              mediaType: m.mediaType || "IMAGE",
              url: m.url,
              caption: m.caption || null,
              sortOrder: idx + 1,
            })),
          });
        }
      });
    }

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

  /**
   * Fundraiser thêm minh chứng giải ngân minh bạch kèm định danh CCCD
   */
  async addDisbursement(campaignId: string, createdBy: string, input: CreateDisbursementInput) {
    let finalNote = input.note || "";
    const headers: string[] = [];

    // 1. Trạng thái khởi tạo hồ sơ giải ngân
    headers.push(`[TRẠNG THÁI: PENDING]`);

    // 2. Tài khoản thụ hưởng đối soát
    if (input.bankAccountNumber) {
      headers.push(
        `[TÀI KHOẢN NHẬN: ${input.bankName || "N/A"} - STK: ${input.bankAccountNumber} - TÊN: ${input.bankAccountName || "N/A"}]`
      );
    }

    // 3. Thông tin định danh CCCD & người nhận
    if (input.idCardNumber) {
      headers.push(
        `[ĐỊNH DANH CCCD: TÊN: ${input.idCardFullName || input.bankAccountName || "N/A"} - SỐ CCCD: ${input.idCardNumber} - NGÀY CẤP: ${input.idCardIssueDate || "N/A"} - NƠI CẤP: ${input.idCardIssuePlace || "N/A"} - SĐT: ${input.idCardPhone || "N/A"} - QUAN HỆ: ${input.recipientRelationship || "Chính chủ"}]`
      );
    }

    // 4. Đường dẫn ảnh chứng minh nhân dân & chân dung
    if (input.idCardFrontUrl || input.idCardBackUrl || input.idCardSelfieUrl) {
      headers.push(
        `[ẢNH ĐỊNH DANH: TRƯỚC: ${input.idCardFrontUrl || ""} | SAU: ${input.idCardBackUrl || ""} | CHÂN DUNG: ${input.idCardSelfieUrl || ""}]`
      );
    }

    if (headers.length > 0) {
      const headerBlock = headers.join("\n");
      finalNote = finalNote ? `${headerBlock}\n${finalNote}` : headerBlock;
    }

    // Gộp ảnh CCCD vào mảng chứng từ để lưu trữ JSON
    const proofs = [...input.proofDocuments];
    if (input.idCardFrontUrl && !proofs.includes(input.idCardFrontUrl)) proofs.push(input.idCardFrontUrl);
    if (input.idCardBackUrl && !proofs.includes(input.idCardBackUrl)) proofs.push(input.idCardBackUrl);
    if (input.idCardSelfieUrl && !proofs.includes(input.idCardSelfieUrl)) proofs.push(input.idCardSelfieUrl);

    return prisma.disbursement.create({
      data: {
        campaignId,
        createdBy,
        title: input.title,
        amount: input.amount,
        disbursementDate: new Date(input.disbursementDate),
        proofDocuments: proofs as Prisma.InputJsonValue,
        note: finalNote || null,
      },
    });
  }

  /**
   * Tìm giải ngân theo ID
   */
  async findDisbursementById(id: string) {
    return prisma.disbursement.findUnique({
      where: { id },
      include: {
        campaign: true,
        creator: true,
      },
    });
  }

  /**
   * Admin duyệt hoặc từ chối hồ sơ giải ngân
   */
  async reviewDisbursement(id: string, input: ReviewDisbursementInput, adminId: string) {
    const item = await prisma.disbursement.findUnique({ where: { id } });
    if (!item) return null;

    let currentNote = item.note || "";
    const reason = input.rejectionReason || input.reviewNote;
    // Thay thế hoặc bổ sung tag [TRẠNG THÁI: ...]
    if (currentNote.includes("[TRẠNG THÁI:")) {
      currentNote = currentNote.replace(
        /\[TRẠNG THÁI:\s*[A-Z_]+(\s*-\s*Lý do:[^\]]*)?\]/i,
        `[TRẠNG THÁI: ${input.status}${reason ? ` - Lý do: ${reason}` : ""}]`
      );
    } else {
      currentNote = `[TRẠNG THÁI: ${input.status}${reason ? ` - Lý do: ${reason}` : ""}]\n${currentNote}`;
    }

    return prisma.disbursement.update({
      where: { id },
      data: {
        note: currentNote,
      },
      include: {
        campaign: true,
        creator: true,
      },
    });
  }

  /**
   * Admin tra cứu toàn bộ danh sách giải ngân và chứng từ minh bạch
   */
  async findDisbursements(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [total, items, aggregate] = await Promise.all([
      prisma.disbursement.count(),
      prisma.disbursement.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              slug: true,
              targetAmount: true,
              currentAmount: true,
              bankName: true,
              bankAccountNumber: true,
              bankAccountName: true,
              beneficiaryInfo: true,
              startDate: true,
              endDate: true,
              createdAt: true,
              status: true,
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      }),
      prisma.disbursement.aggregate({
        _sum: { amount: true },
      }),
    ]);
    return {
      total,
      items,
      pages: Math.ceil(total / limit) || 1,
      totalDisbursed: aggregate._sum.amount || 0,
    };
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
