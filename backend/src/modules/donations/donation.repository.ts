import { auditService } from "../../core/services/audit.service";
import { prisma } from "../../core/database/prisma";
import { Prisma, PaymentStatus, Donation } from "@prisma/client";

export class DonationRepository {
  /**
   * Chạy transaction với mức cô lập ReadCommitted
   */
  transaction<T>(action: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(action, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 60000,
      timeout: 30000,
    });
  }

  /**
   * Khóa hàng chiến dịch với SELECT ... FOR UPDATE
   */
  async lockCampaign(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${id} FOR UPDATE`;
    return tx.campaign.findUnique({ where: { id } });
  }

  /**
   * Khóa hàng khoản đóng góp với SELECT ... FOR UPDATE
   */
  async lockDonation(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM donations WHERE id = ${id} FOR UPDATE`;
    return tx.donation.findUnique({ where: { id } });
  }

  /**
   * Tính tổng thu (RECEIPT / SUCCESS donations) và tổng hoàn (REFUND) từ bảng sổ cái ledger_entries và donations
   */
  async totals(tx: Prisma.TransactionClient, campaignId: string) {
    // 1. Tính tổng tiền từ các giao dịch quyên góp thành công
    const donationAgg = await tx.donation.aggregate({
      where: {
        campaignId,
        paymentStatus: PaymentStatus.SUCCESS,
      },
      _sum: { amount: true },
      _count: true,
    });

    // 2. Tính các khoản hoàn tiền (nếu có trong Sổ cái)
    const refundRows = await tx.ledgerEntry.groupBy({
      by: ["kind"],
      where: { donation: { campaignId }, kind: "REFUND" },
      _sum: { amount: true },
    });

    const received = donationAgg._sum.amount ?? new Prisma.Decimal(0);
    const refunded = refundRows.find((r) => r.kind === "REFUND")?._sum.amount ?? new Prisma.Decimal(0);
    const net = received.minus(refunded);
    const donorCount = donationAgg._count ?? 0;

    return { received, refunded, net, donorCount };
  }

  /**
   * Đồng bộ lại số dư currentAmount và donorCount của chiến dịch từ các giao dịch thành công
   */
  async refreshCampaign(tx: Prisma.TransactionClient, campaignId: string) {
    const totals = await this.totals(tx, campaignId);
    await tx.campaign.update({
      where: { id: campaignId },
      data: {
        currentAmount: totals.net,
        donorCount: totals.donorCount,
      },
    });
    return totals;
  }

  /**
   * Tạo bản ghi quyên góp mới ở trạng thái PENDING
   */
  async createDonation(data: Prisma.DonationCreateInput): Promise<Donation> {
    return prisma.donation.create({
      data,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImageUrl: true,
            targetAmount: true,
            currentAmount: true,
            status: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
          },
        },
      },
    });
  }

  /**
   * Tìm lượt quyên góp theo ID kèm chi tiết chiến dịch và người ủng hộ
   */
  async findById(id: string) {
    return prisma.donation.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            fundraiserId: true,
            targetAmount: true,
            currentAmount: true,
            status: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
          },
        },
        donor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        ledgerEntries: true,
      },
    });
  }

  /**
   * Tìm lượt quyên góp theo mã đối soát giao dịch (hỗ trợ cả mã chính xác, ID, và dạng chuẩn hóa không dấu gạch ngang)
   */
  async findByTransactionCode(transactionCode: string) {
    if (!transactionCode) return null;
    const cleanCode = transactionCode.trim();

    // 1. Tìm chính xác tuyệt đối theo transactionCode
    const byCode = await prisma.donation.findUnique({
      where: { transactionCode: cleanCode },
      include: {
        campaign: true,
      },
    });
    if (byCode) return byCode;

    // 2. Tìm theo ID bản ghi hoặc requestKey
    const byIdOrKey = await prisma.donation.findFirst({
      where: {
        OR: [
          { id: cleanCode },
          {
            paymentGatewayResponse: {
              path: "$.requestKey",
              equals: cleanCode,
            },
          },
        ],
      },
      include: {
        campaign: true,
      },
    });
    if (byIdOrKey) return byIdOrKey;

    // 3. Tìm kiếm chuẩn hóa: nhiều ngân hàng tự xóa dấu gạch nối "-" hoặc khoảng trắng
    // Ví dụ: mã DON-261021-AB12 khi ngân hàng gửi về có thể thành DON261021AB12
    const normalizedInput = cleanCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (normalizedInput.length >= 6) {
      const recentDonations = await prisma.donation.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
        include: { campaign: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const matched = recentDonations.find((d) => {
        const normalizedDb = d.transactionCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        return normalizedInput.includes(normalizedDb) || normalizedDb.includes(normalizedInput);
      });

      if (matched) return matched;
    }

    return null;
  }

  /**
   * Tìm lượt quyên góp theo Idempotency requestKey
   */
  async findByRequestKey(requestKey: string) {
    return prisma.donation.findFirst({
      where: {
        paymentGatewayResponse: {
          path: "$.requestKey",
          equals: requestKey,
        },
      },
      include: {
        campaign: true,
      },
    });
  }

  /**
   * Xác nhận thanh toán thành công trong một ACID Transaction:
   * 1. Khóa hàng bi quan
   * 2. Cập nhật Donation -> SUCCESS, paidAt = now
   * 3. Ghi bút toán RECEIPT vào sổ cái ledger_entries
   * 4. Cập nhật tiến độ chiến dịch
   * 5. Tạo thông báo nhận tiền cho Chủ chiến dịch
   * 6. Tạo thông báo cho Nhà hảo tâm (nếu có tài khoản)
   * 7. Ghi AuditLog
   */
  async confirmPayment(
    donationId: string,
    gatewayResponse?: any,
    actorId?: string
  ) {
    return this.transaction(async (tx) => {
      const donation = await this.lockDonation(tx, donationId);
      if (!donation) {
        const error: any = new Error("Không tìm thấy giao dịch quyên góp");
        error.statusCode = 404;
        throw error;
      }

      if (donation.paymentStatus === PaymentStatus.SUCCESS) {
        return {
          message: "Giao dịch này đã được xác nhận thành công từ trước",
          donation,
        };
      }

      const campaign = await this.lockCampaign(tx, donation.campaignId);
      if (!campaign) {
        const error: any = new Error("Không tìm thấy chiến dịch");
        error.statusCode = 404;
        throw error;
      }

      // 1. Cập nhật Donation
      const updatedDonation = await tx.donation.update({
        where: { id: donationId },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          paymentGatewayResponse: gatewayResponse || undefined,
        },
        include: {
          campaign: true,
          donor: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // 2. Ghi bút toán Sổ cái (LedgerEntry)
      await tx.ledgerEntry.create({
        data: {
          donationId,
          kind: "RECEIPT",
          amount: donation.amount,
        },
      });

      // 3. Cập nhật tiến độ chiến dịch từ Sổ cái
      const totals = await this.refreshCampaign(tx, campaign.id);

      const donorDisplayName = donation.isAnonymous
        ? "Một nhà hảo tâm ẩn danh"
        : donation.donorName || "Nhà hảo tâm";

      // 4. Tạo thông báo nhận tiền cho Chủ chiến dịch (Fundraiser)
      await tx.notification.create({
        data: {
          userId: campaign.fundraiserId,
          title: "Chiến dịch nhận được ủng hộ mới!",
          message: `${donorDisplayName} vừa ủng hộ ${Number(donation.amount).toLocaleString("vi-VN")} VNĐ cho chiến dịch "${campaign.title}". Lời nhắn: "${donation.message || "Không có"}"`,
          type: "DONATION_RECEIVED",
          linkUrl: `/campaigns/${campaign.slug}`,
        },
      });

      // 5. Tạo thông báo cho Nhà hảo tâm (nếu có tài khoản đăng nhập)
      if (donation.donorId) {
        await tx.notification.create({
          data: {
            userId: donation.donorId,
            title: "Quyên góp thành công!",
            message: `Bạn đã ủng hộ thành công ${Number(donation.amount).toLocaleString("vi-VN")} VNĐ cho chiến dịch "${campaign.title}". Xin cảm ơn tấm lòng vàng của bạn!`,
            type: "DONATION_SUCCESS",
            linkUrl: `/campaigns/${campaign.slug}`,
          },
        });
      }

      // 6. Ghi AuditLog
      await auditService.write({
          userId: actorId ?? null,
          action: "DONATION_RECEIVED",
          entityName: "Donation",
          entityId: donationId,
        }, tx);

      return {
        donation: updatedDonation,
        campaignProgress: {
          targetAmount: campaign.targetAmount,
          currentAmount: totals.net,
          donorCount: totals.donorCount,
          percent:
            Number(totals.net) > 0 && (Number(totals.net) / Number(campaign.targetAmount)) * 100 < 1
              ? Number(((Number(totals.net) / Number(campaign.targetAmount)) * 100).toFixed(1))
              : Math.min(
                  100,
                  Math.round((Number(totals.net) / Number(campaign.targetAmount)) * 100)
                ),
        },
      };
    });
  }

  /**
   * Lấy danh sách ủng hộ thành công của một chiến dịch (Công khai)
   */
  async findCampaignDonations(campaignId: string, skip: number, take: number) {
    return prisma.donation.findMany({
      where: {
        campaignId,
        paymentStatus: PaymentStatus.SUCCESS,
      },
      skip,
      take,
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amount: true,
        donorName: true,
        message: true,
        isAnonymous: true,
        paidAt: true,
        createdAt: true,
        donor: {
          select: {
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async countCampaignDonations(campaignId: string): Promise<number> {
    return prisma.donation.count({
      where: {
        campaignId,
        paymentStatus: PaymentStatus.SUCCESS,
      },
    });
  }

  /**
   * Lấy danh sách đối soát nội bộ của một chiến dịch (Dành riêng cho Fundraiser / Admin)
   * Bao gồm cả SĐT, Email, transactionCode, gateway response
   */
  async findFundraiserCampaignDonations(campaignId: string, skip: number, take: number, status?: PaymentStatus) {
    const where: Prisma.DonationWhereInput = {
      campaignId,
      ...(status ? { paymentStatus: status } : {}),
    };

    return prisma.donation.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        transactionCode: true,
        amount: true,
        donorName: true,
        donorEmail: true,
        donorPhone: true,
        message: true,
        isAnonymous: true,
        paymentMethod: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
        donor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async countFundraiserCampaignDonations(campaignId: string, status?: PaymentStatus): Promise<number> {
    return prisma.donation.count({
      where: {
        campaignId,
        ...(status ? { paymentStatus: status } : {}),
      },
    });
  }

  /**
   * Lịch sử quyên góp của một người dùng
   */
  async findUserDonations(userId: string, skip: number, take: number) {
    return prisma.donation.findMany({
      where: { donorId: userId },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImageUrl: true,
            status: true,
          },
        },
      },
    });
  }

  async countUserDonations(userId: string): Promise<number> {
    return prisma.donation.count({
      where: { donorId: userId },
    });
  }

  /**
   * Tra cứu toàn bộ các khoản quyên góp (Dành cho Admin)
   */
  async findAll(where: Prisma.DonationWhereInput, orderBy: any, skip: number, take: number) {
    return prisma.donation.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        donor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        ledgerEntries: true,
      },
    });
  }

  async countAll(where: Prisma.DonationWhereInput): Promise<number> {
    return prisma.donation.count({ where });
  }
}

export const donationRepository = new DonationRepository();
