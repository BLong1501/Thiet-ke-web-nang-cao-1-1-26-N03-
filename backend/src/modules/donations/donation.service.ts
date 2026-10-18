import crypto from "crypto";
import { donationRepository, DonationRepository } from "./donation.repository";
import { prisma } from "../../core/database/prisma";
import { CampaignStatus, PaymentMethod, PaymentStatus, UserRole, Prisma } from "@prisma/client";
import { CreateDonationInput, ConfirmDonationInput, DonationQueryInput } from "./donation.validation";
import { AppError } from "../../core/errors/app.error";
import {
  campaignCacheKeys,
  CampaignCacheTTL,
  invalidatePublicCampaignCache,
  readCampaignCache,
  writeCampaignCache,
  type CacheStatus,
} from "../../core/cache/campaign-cache";
import { assertAnyObjectAccess, assertObjectAccess, type Actor } from "../../core/auth/object-access";
import { findBank } from "../../core/constants/banks.constant";
import { mailService } from "../../core/services/mail.service";

export const DONATION_EXPIRATION_MS = 10 * 60 * 1000; // 10 phút hiệu lực

export class DonationService {
  constructor(private repo: DonationRepository = donationRepository) {}

  /**
   * Kiểm tra và tự động cập nhật trạng thái hết hạn cho giao dịch PENDING quá 10 phút
   */
  async checkAndExpireDonation<T extends { id: string; paymentStatus: PaymentStatus; createdAt: Date | string; paymentGatewayResponse?: any }>(
    donation: T
  ): Promise<T> {
    if (!donation || donation.paymentStatus !== PaymentStatus.PENDING) {
      return donation;
    }
    const createdAtTime = new Date(donation.createdAt).getTime();
    if (Date.now() - createdAtTime > DONATION_EXPIRATION_MS) {
      const existingGatewayResp =
        typeof donation.paymentGatewayResponse === "object" && donation.paymentGatewayResponse !== null
          ? donation.paymentGatewayResponse
          : {};
      return (await prisma.donation.update({
        where: { id: donation.id },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          paymentGatewayResponse: {
            ...existingGatewayResp,
            failureReason: "EXPIRED_AFTER_10_MINUTES",
            expiredAt: new Date().toISOString(),
          },
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              slug: true,
              bankName: true,
              bankAccountNumber: true,
              bankAccountName: true,
              beneficiaryInfo: true,
              fundraiserId: true,
            },
          },
          donor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      })) as unknown as T;
    }
    return donation;
  }

  /**
   * Khởi tạo giao dịch quyên góp mới:
   * Trả về thông tin thanh toán: Mã VietQR ngân hàng hoặc Mã QR MoMo
   */
  async createDonation(input: CreateDonationInput, currentUserId?: string) {
    // 1. Kiểm tra tính hợp lệ của chiến dịch
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        endDate: true,
        startDate: true,
        bankAccountName: true,
        bankAccountNumber: true,
        bankName: true,
      },
    });

    if (!campaign) {
      throw new AppError("Chiến dịch gây quỹ không tồn tại", 404);
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new AppError("Chiến dịch hiện không trong trạng thái tiếp nhận quyên góp", 400);
    }

    const now = new Date();
    if (now > new Date(campaign.endDate)) {
      throw new AppError("Chiến dịch đã kết thúc thời gian gây quỹ", 400);
    }

    // 2. Chống tạo trùng lặp với Idempotency Key (nếu có cung cấp)
    if (input.requestKey) {
      const existing = await this.repo.findByTransactionCode(input.requestKey);
      if (existing) {
        if (Number(existing.amount) !== input.amount || existing.campaignId !== input.campaignId) {
          throw new AppError("requestKey đã được sử dụng với nội dung quyên góp khác", 409);
        }
        return {
          replayed: true,
          message: "Yêu cầu quyên góp đã được khởi tạo từ trước (Idempotent Replay)",
          donation: existing,
          paymentInstructions: this.buildPaymentInstructions(campaign, existing.amount, existing.transactionCode, existing.id, existing.createdAt),
        };
      }
    }

    // 3. Điền thông tin người ủng hộ nếu có user đăng nhập
    let donorName = input.donorName;
    let donorEmail = input.donorEmail;
    let donorPhone = input.donorPhone;

    if (currentUserId) {
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { fullName: true, email: true, phoneNumber: true },
      });
      if (user) {
        donorName = donorName || user.fullName;
        donorEmail = donorEmail || user.email;
        donorPhone = donorPhone || user.phoneNumber || undefined;
      }
    }

    if (!donorName) {
      donorName = input.isAnonymous ? "Nhà hảo tâm ẩn danh" : "Nhà hảo tâm";
    }

    // 4. Tạo mã giao dịch đối soát duy nhất (e.g., DON-261007-AB12 hoặc requestKey)
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const transactionCode = input.requestKey || `DON-${datePrefix}-${randomSuffix}`;

    // 5. Lưu bản ghi quyên góp vào CSDL
    const donation = await this.repo.createDonation({
      campaign: { connect: { id: input.campaignId } },
      ...(currentUserId ? { donor: { connect: { id: currentUserId } } } : {}),
      transactionCode,
      amount: input.amount,
      donorName,
      donorEmail: donorEmail || null,
      donorPhone: donorPhone || null,
      message: input.message || null,
      isAnonymous: input.isAnonymous || false,
      paymentMethod: input.paymentMethod || PaymentMethod.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PENDING,
      paymentGatewayResponse: input.requestKey ? { requestKey: input.requestKey } : undefined,
    });

    // 6. Tạo hướng dẫn thanh toán chi tiết (VietQR hoặc MoMo) kèm thời gian hết hạn
    const paymentInstructions = this.buildPaymentInstructions(campaign, input.amount, transactionCode, donation.id, donation.createdAt);

    return {
      replayed: false,
      message: "Khởi tạo yêu cầu quyên góp thành công. Vui lòng quét mã QR hoặc chuyển khoản để hoàn tất (hết hạn sau 10 phút).",
      donation,
      paymentInstructions,
    };
  }

  /**
   * Tạo chi tiết hướng dẫn thanh toán: VietQR Ngân hàng & Mã QR Ví MoMo kèm thông tin hết hạn
   */
  private buildPaymentInstructions(campaign: any, amount: number | Prisma.Decimal, transactionCode: string, donationId: string, createdAt?: Date | string) {
    const numericAmount = Number(amount);
    // 1. Tài khoản Quỹ trung tâm FundTrust (Ký quỹ trung gian tiếp nhận tiền ủng hộ qua SePay)
    const bankName = "Ngân hàng Ngoại thương Việt Nam (Vietcombank)";
    const bankAccountNumber = "1020369607";
    const bankAccountName = "QUY GAY QUY CONG DONG FUNDTRUST";

    // Tìm mã BIN ngân hàng chuẩn Napas 247 (Vietcombank: 970436)
    const foundBank = findBank(bankName);
    const bankIdentifier = foundBank?.bin || "970436";

    // 1. VietQR ngân hàng chuẩn Napas 247
    const vietQrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankIdentifier)}-${encodeURIComponent(bankAccountNumber)}-compact2.png?amount=${numericAmount}&addInfo=${encodeURIComponent(transactionCode)}&accountName=${encodeURIComponent(bankAccountName)}`;

    // 2. Ví MoMo
    let legalMeta: any = null;
    if (campaign.beneficiaryInfo) {
      try {
        legalMeta = JSON.parse(campaign.beneficiaryInfo);
      } catch {
        legalMeta = null;
      }
    }
    const momoPhone = legalMeta?.momoPhone || campaign.fundraiser?.phoneNumber || "0987654321";
    const momoAccountName = legalMeta?.momoAccountName || bankAccountName;
    const momoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=2|99|${momoPhone}|${encodeURIComponent(momoAccountName)}||0|0|${numericAmount}|${encodeURIComponent(transactionCode)}|transfer_p2p`;
    const momoDeepLink = `momo://?action=payWithApp&isScanQR=true`;

    const createdTime = createdAt ? new Date(createdAt).getTime() : Date.now();
    const expiresAt = new Date(createdTime + DONATION_EXPIRATION_MS).toISOString();

    return {
      transactionCode,
      amount: numericAmount,
      currency: "VND",
      expiresAt,
      expiresInSeconds: Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
      bankTransfer: {
        methodName: "Chuyển khoản Ngân hàng (VietQR Napas 247)",
        bankName,
        accountNumber: bankAccountNumber,
        accountName: bankAccountName,
        amount: numericAmount,
        content: transactionCode,
        qrCodeUrl: vietQrUrl,
        instructions: `Mở ứng dụng Mobile Banking của bạn, chọn 'Quét mã QR' và quét mã trên, hoặc chuyển khoản đến STK ${bankAccountNumber} (${bankName}) với nội dung: ${transactionCode}`,
      },
      momo: {
        methodName: "Ví điện tử MoMo",
        phoneNumber: momoPhone,
        accountName: momoAccountName,
        amount: numericAmount,
        content: transactionCode,
        qrCodeUrl: momoQrUrl,
        deepLink: momoDeepLink,
        instructions: `Mở ứng dụng MoMo, chọn 'Quét mã QR' và quét mã MoMo trên, với lời nhắn chuyển tiền là: ${transactionCode}`,
      },
      simulationConfirmUrl: `/api/v1/donations/${donationId}/confirm`,
    };
  }

  /**
   * Xác nhận thanh toán thành công (Mô phỏng Webhook / IPN / Cổng thanh toán)
   */
  async confirmPayment(donationId: string, input: ConfirmDonationInput, actor: Actor) {
    let donation = await this.repo.findById(donationId);
    if (!donation) {
      throw new AppError("Không tìm thấy giao dịch quyên góp", 404);
    }

    donation = await this.checkAndExpireDonation(donation);

    await assertObjectAccess({
      actor,
      ownerId: donation.donorId,
      entityName: "Donation",
      entityId: donationId,
      message: "Bạn không có quyền xác nhận khoản đóng góp này",
    });

    if (donation.paymentStatus === PaymentStatus.SUCCESS) {
      return {
        message: "Giao dịch này đã được xác nhận thanh toán thành công từ trước",
        donation,
      };
    }

    if (donation.paymentStatus !== PaymentStatus.PENDING) {
      throw new AppError("Giao dịch đã hết hạn hoặc không ở trạng thái chờ thanh toán", 400);
    }

    const result = await this.repo.confirmPayment(
      donationId,
      input.paymentGatewayResponse || { simulated: true, note: input.note || "Thanh toán mô phỏng thành công" }
    );
    await invalidatePublicCampaignCache();

    // Gửi email biên nhận báo cáo giao dịch tới người đóng góp
    this.sendReceiptEmailSafely(result.donation);

    return {
      message: "Xác nhận thanh toán quyên góp thành công! Đã gửi thông báo và cập nhật tiến độ chiến dịch.",
      donation: result.donation,
      campaignProgress: result.campaignProgress,
    };
  }

  private async record(
    tx: Prisma.TransactionClient,
    userId: string,
    donation: any,
    action: string,
    message: string
  ) {
    await tx.auditLog.create({
      data: {
        userId,
        action,
        entityName: "Donation",
        entityId: donation.id,
        details: { amount: donation.amount.toString(), message, simulated: true },
      },
    });
    if (donation.donorId) {
      await tx.notification.create({
        data: {
          userId: donation.donorId,
          title: "Đóng góp kiểm thử Buổi 6",
          message,
          type: action,
        },
      });
    }
  }

  /**
   * Admin xác nhận thanh toán mô phỏng (Endpoint confirm-demo phục vụ kiểm thử Buổi 6)
   */
  async confirm(actor: { userId: string; role: string }, id: string) {
    if (!["development", "test"].includes(process.env.NODE_ENV ?? "")) {
      throw new AppError("Xác nhận thanh toán mô phỏng chỉ dùng trong development/test", 403);
    }
    return this.repo.transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: actor.userId } });
      if (!user || user.status !== "ACTIVE" || !user.isEmailVerified) {
        throw new AppError("Tài khoản không được phép thực hiện thao tác", 403);
      }
      if (user.role !== UserRole.ADMIN) {
        throw new AppError("Chỉ quản trị viên được thực hiện thao tác", 403);
      }

      const ref = await tx.donation.findUnique({ where: { id }, select: { campaignId: true } });
      if (!ref) throw new AppError("Không tìm thấy khoản đóng góp", 404);
      const campaign = await this.repo.lockCampaign(tx, ref.campaignId);
      const donation = await this.repo.lockDonation(tx, id);
      if (!campaign || !donation) throw new AppError("Không tìm thấy dữ liệu", 404);

      if (donation.paymentStatus !== PaymentStatus.PENDING) {
        throw new AppError("Chỉ xác nhận khoản đóng góp đang PENDING", 422);
      }
      const now = new Date();
      if (campaign.status !== CampaignStatus.ACTIVE || now < campaign.startDate || now >= campaign.endDate) {
        throw new AppError("Chiến dịch không còn nhận tiền", 422);
      }

      await tx.ledgerEntry.create({ data: { donationId: id, kind: "RECEIPT", amount: donation.amount } });
      const updated = await tx.donation.update({ where: { id }, data: { paymentStatus: PaymentStatus.SUCCESS, paidAt: now } });
      const totals = await this.repo.refreshCampaign(tx, campaign.id);
      await this.record(tx, actor.userId, donation, "DEMO_PAYMENT_CONFIRMED", "Đã ghi nhận đóng góp mô phỏng");
      return { donation: updated, totals, simulated: true };
    }).then(async (result) => {
      await invalidatePublicCampaignCache();
      return result;
    });
  }

  async confirmDemo(actor: { userId: string; role: string }, donationId: string) {
    return this.confirm(actor, donationId);
  }

  /**
   * Hoàn tiền quyên góp an toàn với Khóa hàng Bi quan (Pessimistic Row-Locking)
   */
  async refund(actor: { userId: string; role: string }, donationId: string, reason?: string) {
    return this.repo.transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: actor.userId } });
      if (!user || user.status !== "ACTIVE" || !user.isEmailVerified) {
        throw new AppError("Tài khoản chưa được kích hoạt hoặc chưa xác thực email", 403);
      }

      const donationMeta = await tx.donation.findUnique({
        where: { id: donationId },
        select: { campaignId: true },
      });
      if (!donationMeta) throw new AppError("Không tìm thấy khoản đóng góp", 404);

      // Khóa hàng chiến dịch trước, khóa khoản đóng góp sau (chống deadlock)
      const campaign = await this.repo.lockCampaign(tx, donationMeta.campaignId);
      if (!campaign) throw new AppError("Không tìm thấy chiến dịch", 404);

      const donation = await this.repo.lockDonation(tx, donationId);
      if (!donation) throw new AppError("Không tìm thấy khoản đóng góp", 404);

      await assertObjectAccess({
        actor: { userId: user.id, role: user.role },
        ownerId: donation.donorId,
        entityName: "Donation",
        entityId: donationId,
        message: "Bạn không có quyền sở hữu khoản đóng góp này",
      });

      if (donation.paymentStatus !== PaymentStatus.SUCCESS) {
        throw new AppError("Chỉ hoàn khoản SUCCESS chưa được hoàn tiền", 422);
      }

      // Kiểm tra xem chiến dịch đã từng giải ngân chưa
      const disbursementCount = await tx.disbursement.count({
        where: { campaignId: campaign.id },
      });
      if (disbursementCount > 0) {
        throw new AppError("Không thể hoàn tiền chiến dịch đã tiến hành giải ngân", 422);
      }

      const totals = await this.repo.totals(tx, campaign.id);
      const isExpiredUnderTarget =
        new Date() >= new Date(campaign.endDate) && totals.received.lessThan(campaign.targetAmount);

      if (campaign.status !== CampaignStatus.CANCELLED && !isExpiredUnderTarget) {
        throw new AppError("Chiến dịch chưa đủ điều kiện hoàn tiền", 422);
      }

      // 1. Thêm bút toán REFUND vào Sổ cái
      await (tx as any).ledgerEntry.create({
        data: {
          donationId: donation.id,
          kind: "REFUND",
          amount: donation.amount,
        },
      });

      // 2. Chuyển trạng thái donation -> REFUNDED
      const updatedDonation = await tx.donation.update({
        where: { id: donation.id },
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });

      // 3. Cập nhật cache chiến dịch
      await this.repo.refreshCampaign(tx, campaign.id);

      // 4. Ghi AuditLog & Notification
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: "DEMO_FULL_REFUND",
          entityName: "Donation",
          entityId: donation.id,
          details: { amount: donation.amount.toString(), reason: reason || "Hoàn tiền đóng góp" },
        },
      });

      if (donation.donorId) {
        await tx.notification.create({
          data: {
            userId: donation.donorId,
            title: "Hoàn tiền quyên góp",
            message: `Khoản đóng góp ${Number(donation.amount).toLocaleString("vi-VN")} VNĐ cho chiến dịch "${campaign.title}" đã được hoàn lại. Lý do: ${reason || "Chiến dịch hủy hoặc hết hạn"}.`,
            type: "DEMO_FULL_REFUND",
          },
        });
      }

      return updatedDonation;
    }).then(async (result) => {
      await invalidatePublicCampaignCache();
      return result;
    });
  }

  /**
   * Hủy chiến dịch (Dành cho Admin)
   */
  async cancelCampaign(actor: { userId: string; role: string }, campaignId: string, reason?: string) {
    return this.repo.transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: actor.userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new AppError("Chỉ Quản trị viên mới có quyền hủy chiến dịch", 403);
      }

      const campaign = await this.repo.lockCampaign(tx, campaignId);
      if (!campaign) throw new AppError("Không tìm thấy chiến dịch", 404);

      if (campaign.status !== CampaignStatus.ACTIVE && campaign.status !== CampaignStatus.PAUSED) {
        throw new AppError("Chỉ có thể hủy chiến dịch đang ở trạng thái ACTIVE hoặc PAUSED", 422);
      }

      const disbursementCount = await tx.disbursement.count({ where: { campaignId } });
      if (disbursementCount > 0) {
        throw new AppError("Không thể hủy chiến dịch đã giải ngân", 422);
      }

      const updated = await tx.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.CANCELLED },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: "CANCEL_CAMPAIGN",
          entityName: "Campaign",
          entityId: campaignId,
          details: { reason: reason || "Admin hủy chiến dịch" },
        },
      });

      return updated;
    }).then(async (result) => {
      await invalidatePublicCampaignCache();
      return result;
    });
  }

  /**
   * Đối soát số dư giữa Sổ cái và Cache chiến dịch
   */
  async reconcile(actor: { userId: string; role: string }, campaignId: string) {
    return this.repo.transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: actor.userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new AppError("Yêu cầu quyền ADMIN để xem đối soát sổ cái", 403);
      }

      const campaign = await this.repo.lockCampaign(tx, campaignId);
      if (!campaign) throw new AppError("Không tìm thấy chiến dịch", 404);

      const totals = await this.repo.totals(tx, campaignId);
      return {
        campaignId,
        received: totals.received,
        refunded: totals.refunded,
        net: totals.net,
        cachedAmount: campaign.currentAmount,
        matches: totals.net.equals(campaign.currentAmount),
      };
    });
  }

  /**
   * Lấy danh sách quyên góp công khai của một chiến dịch
   */
  async getCampaignDonations(campaignId: string, page = 1, limit = 10): Promise<{
    items: any[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    cacheStatus: CacheStatus;
  }> {
    const cacheKey = campaignCacheKeys.donations(campaignId, page, limit);
    const cached = await readCampaignCache<{
      items: any[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(cacheKey);
    if (cached) {
      return { ...cached, cacheStatus: "HIT" };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.repo.findCampaignDonations(campaignId, skip, limit),
      this.repo.countCampaignDonations(campaignId),
    ]);

    const formattedItems = items.map((item) => ({
      id: item.id,
      amount: item.amount,
      donorName: item.isAnonymous ? "Nhà hảo tâm ẩn danh" : item.donorName,
      message: item.message,
      isAnonymous: item.isAnonymous,
      paidAt: item.paidAt,
      createdAt: item.createdAt,
      avatarUrl: item.isAnonymous ? null : item.donor?.avatarUrl || null,
    }));

    const payload = {
      items: formattedItems,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    await writeCampaignCache(cacheKey, payload, CampaignCacheTTL.donations);
    return { ...payload, cacheStatus: "MISS" };
  }

  /**
   * Lịch sử quyên góp của tài khoản cá nhân
   */
  async getMyDonations(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.repo.findUserDonations(userId, skip, limit),
      this.repo.countUserDonations(userId),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Tra cứu chi tiết một giao dịch quyên góp
   */
  async getDonationDetail(donationId: string, currentUserId?: string, userRole?: UserRole) {
    let donation = await this.repo.findById(donationId);
    if (!donation) {
      throw new AppError("Không tìm thấy giao dịch quyên góp", 404);
    }

    donation = await this.checkAndExpireDonation(donation);

    await assertAnyObjectAccess({
      actor: currentUserId ? { userId: currentUserId, role: userRole || UserRole.USER } : null,
      ownerIds: [donation.donorId, (donation as any).campaign?.fundraiserId],
      entityName: "Donation",
      entityId: donationId,
      message: "Bạn không sở hữu khoản đóng góp này",
    });

    return donation;
  }

  /**
   * Admin tra cứu toàn bộ giao dịch quyên góp
   */
  async getAllDonationsForAdmin(query: DonationQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DonationWhereInput = {};
    if (query.status) where.paymentStatus = query.status;
    if (query.campaignId) where.campaignId = query.campaignId;

    const orderBy: any = { [query.sortBy]: query.sortOrder };

    const [items, total] = await Promise.all([
      this.repo.findAll(where, orderBy, skip, limit),
      this.repo.countAll(where),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Tự động quét và đóng các chiến dịch đã hết hạn gây quỹ
   */
  async expireCampaigns() {
    return prisma.campaign.updateMany({
      where: {
        status: { in: [CampaignStatus.ACTIVE, CampaignStatus.PAUSED] },
        endDate: { lte: new Date() },
      },
      data: { status: CampaignStatus.COMPLETED },
    });
  }

  /**
   * Lấy danh sách đối soát nội bộ (kèm SĐT, Email, Transaction Code) cho Fundraiser & Admin
   */
  async getFundraiserCampaignDonations(
    actor: { userId: string; role: string },
    campaignId: string,
    page: number = 1,
    limit: number = 10,
    status?: PaymentStatus
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        slug: true,
        fundraiserId: true,
        currentAmount: true,
        targetAmount: true,
        status: true,
      },
    });

    if (!campaign) {
      throw new AppError("Chiến dịch không tồn tại", 404);
    }

    await assertObjectAccess({
      actor,
      ownerId: campaign.fundraiserId,
      entityName: "Campaign",
      entityId: campaignId,
      message: "Bạn không có quyền xem thông tin đối soát của chiến dịch này",
    });

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.repo.findFundraiserCampaignDonations(campaignId, skip, limit, status),
      this.repo.countFundraiserCampaignDonations(campaignId, status),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        status: campaign.status,
        currentAmount: campaign.currentAmount,
        targetAmount: campaign.targetAmount,
      },
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Tra cứu trạng thái thanh toán công khai (phục vụ Polling tự động tại giao diện VietQR)
   */
  async getPublicStatus(idOrTransactionCode: string) {
    let donation: any = await this.repo.findById(idOrTransactionCode);
    if (!donation) {
      donation = await this.repo.findByTransactionCode(idOrTransactionCode);
    }
    if (!donation) {
      throw new AppError("Không tìm thấy giao dịch quyên góp", 404);
    }
    donation = await this.checkAndExpireDonation(donation);

    const isExpired = donation.paymentStatus === PaymentStatus.FAILED;
    const createdTime = new Date(donation.createdAt).getTime();
    const expiresAt = new Date(createdTime + DONATION_EXPIRATION_MS).toISOString();
    const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

    return {
      id: donation.id,
      transactionCode: donation.transactionCode,
      paymentStatus: donation.paymentStatus,
      amount: Number(donation.amount),
      campaignId: donation.campaignId,
      paidAt: donation.paidAt,
      createdAt: donation.createdAt,
      expiresAt,
      remainingSeconds,
      isExpired,
    };
  }

  /**
   * Xử lý Webhook tự động biến động số dư ngân hàng (SePay / Casso / PayOS / Banking Webhook)
   */
  async handleBankingWebhook(payload: any) {
    const content = String(
      payload.content ||
      payload.description ||
      payload.transferContent ||
      payload.transactionCode ||
      payload.orderCode ||
      ""
    );

    const uuidMatch = content.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    const donMatch = content.match(/(DON-[A-Z0-9-]+)/i);
    const transactionCode = uuidMatch ? uuidMatch[1] : donMatch ? donMatch[1] : content.trim();

    if (!transactionCode) {
      return { success: false, message: "Không tìm thấy mã giao dịch trong nội dung chuyển khoản" };
    }

    let donation = await this.repo.findByTransactionCode(transactionCode);
    if (!donation) {
      return { success: false, message: `Không tìm thấy khoản quyên góp với mã: ${transactionCode}` };
    }

    if (donation.paymentStatus === PaymentStatus.SUCCESS) {
      return { success: true, message: "Giao dịch đã được thanh toán thành công trước đó", donation };
    }

    donation = await this.checkAndExpireDonation(donation);
    if (donation.paymentStatus === PaymentStatus.FAILED) {
      return {
        success: false,
        message: `Giao dịch ${transactionCode} đã hết hạn (quá 10 phút), phiên giao dịch đã bị khóa`,
        donation,
      };
    }

    const result = await this.repo.confirmPayment(donation.id, {
      gateway: payload.gateway || "BANKING_WEBHOOK",
      referenceCode: payload.referenceCode || payload.id || null,
      transferAmount: payload.transferAmount || payload.amount || Number(donation.amount),
      note: "Xác nhận tự động qua Webhook biến động số dư ngân hàng (VietQR)",
    });

    await invalidatePublicCampaignCache();

    // Gửi email biên nhận báo cáo giao dịch tới người đóng góp
    this.sendReceiptEmailSafely(result.donation);

    return {
      success: true,
      message: "Đã xác nhận thanh toán thành công qua Webhook ngân hàng",
      donation: result.donation,
      campaignProgress: result.campaignProgress,
    };
  }

  /**
   * Mô phỏng chuyển khoản thành công (phục vụ kiểm thử/demo trên giao diện)
   */
  async simulateSuccess(donationId: string) {
    let donation = await this.repo.findById(donationId);
    if (!donation) {
      throw new AppError("Không tìm thấy giao dịch quyên góp", 404);
    }
    donation = await this.checkAndExpireDonation(donation);
    if (donation.paymentStatus === PaymentStatus.FAILED) {
      throw new AppError("Giao dịch đã quá hạn 10 phút và đã hết hiệu lực. Vui lòng tạo giao dịch mới.", 400);
    }
    if (donation.paymentStatus === PaymentStatus.SUCCESS) {
      return {
        message: "Giao dịch đã được xác nhận thanh toán thành công từ trước",
        donation,
      };
    }
    const result = await this.repo.confirmPayment(donationId, {
      simulated: true,
      gateway: "VIETQR_SIMULATION",
      note: "Mô phỏng thanh toán thành công qua giao diện VietQR",
    });
    await invalidatePublicCampaignCache();

    // Gửi email biên nhận báo cáo giao dịch tới người đóng góp
    this.sendReceiptEmailSafely(result.donation);

    return {
      message: "Xác nhận thanh toán mô phỏng thành công!",
      donation: result.donation,
      campaignProgress: result.campaignProgress,
    };
  }

  /**
   * Tự động gửi email biên nhận giao dịch cho người ủng hộ (đã đăng nhập hoặc khách vãng lai có nhập email)
   */
  private sendReceiptEmailSafely(donation: any) {
    const recipientEmail = donation.donor?.email || donation.donorEmail;
    if (!recipientEmail) return;

    mailService
      .sendDonationReceiptEmail({
        to: recipientEmail,
        donorName: donation.donor?.fullName || donation.donorName || "Nhà hảo tâm",
        campaignTitle: donation.campaign?.title || "Chiến dịch gây quỹ cộng đồng",
        amount: Number(donation.amount),
        transactionCode: donation.transactionCode,
        paidAt: donation.paidAt || new Date(),
        message: donation.message || undefined,
        donationId: donation.id,
      })
      .catch((err) => {
        console.error(`❌ Gửi email biên nhận tới ${recipientEmail} thất bại:`, err);
      });
  }
}

export const donationService = new DonationService();
