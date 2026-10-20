import { auditService } from "../../core/services/audit.service";
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
import { PayOS } from "@payos/node";

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
          paymentInstructions: await this.buildPaymentInstructions(campaign, existing.amount, existing.transactionCode, existing.id, existing.createdAt),
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

    // 6. Tạo hướng dẫn thanh toán chi tiết (tích hợp PayOS VietQR Pro) kèm thời gian hết hạn
    const paymentInstructions = await this.buildPaymentInstructions(campaign, input.amount, transactionCode, donation.id, donation.createdAt);

    return {
      replayed: false,
      message: "Khởi tạo yêu cầu quyên góp thành công. Vui lòng quét mã QR hoặc chuyển khoản để hoàn tất (hết hạn sau 10 phút).",
      donation,
      paymentInstructions,
    };
  }

  /**
   * Tạo chi tiết hướng dẫn thanh toán: Tích hợp PayOS VietQR Pro & Mã QR Ví MoMo kèm thông tin hết hạn
   */
  private async buildPaymentInstructions(campaign: any, amount: number | Prisma.Decimal, transactionCode: string, donationId: string, createdAt?: Date | string) {
    const numericAmount = Number(amount);
    // Cấu hình ngân hàng mặc định
    let bankName = process.env.BANK_NAME || "Ngân hàng Quân Đội (MB Bank)";
    let bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER || "0344907168";
    let bankAccountName = process.env.BANK_ACCOUNT_NAME || "TRAN BAO LONG";
    let vietQrContent = transactionCode;
    let vietQrUrl = "";
    let payosCheckoutUrl = "";

    // Tìm mã BIN ngân hàng chuẩn Napas 247 (MB: 970422)
    const foundBank = findBank(bankName);
    let bankIdentifier = foundBank?.bin || "970422";

    // 1. TẠO PAYMENT REQUEST QUA PAYOS API
    // Giúp PayOS ghi nhận đơn hàng trên Dashboard và tự động kích hoạt Webhook khi có tiền vào MBBank
    const clientId = (process.env.PAYOS_CLIENT_ID || "").trim();
    const apiKey = (process.env.PAYOS_API_KEY || "").trim();
    const checksumKey = (process.env.PAYOS_CHECKSUM_KEY || "").trim();

    if (clientId && apiKey && checksumKey) {
      try {
        const payos = new PayOS({ clientId, apiKey, checksumKey });
        // PayOS orderCode: số nguyên dương duy nhất (6 chữ số cuối timestamp + 3 số ngẫu nhiên)
        const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900));
        const cleanDesc = `FT ${transactionCode.replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 25);
        const clientUrl = (process.env.CLIENT_URL || "https://thiet-ke-web-nang-cao-1-1-26-n03.vercel.app").trim();

        const payosLink = await payos.paymentRequests.create({
          orderCode,
          amount: numericAmount,
          description: cleanDesc,
          cancelUrl: `${clientUrl}/campaigns/${campaign.slug || campaign.id}?cancel=true`,
          returnUrl: `${clientUrl}/campaigns/${campaign.slug || campaign.id}?success=true`,
        });

        if (payosLink) {
          console.log(`✓ [PAYOS PAYMENT LINK] Tạo thành công đơn hàng PayOS #${orderCode} cho ${transactionCode}`);
          bankAccountNumber = payosLink.accountNumber || bankAccountNumber;
          bankAccountName = payosLink.accountName || bankAccountName;
          bankIdentifier = payosLink.bin || bankIdentifier;
          vietQrContent = payosLink.description || cleanDesc;
          payosCheckoutUrl = payosLink.checkoutUrl || "";

          // Cập nhật thông tin PayOS vào CSDL để Webhook dễ dàng đối soát theo orderCode
          await prisma.donation.update({
            where: { id: donationId },
            data: {
              paymentGatewayResponse: {
                orderCode,
                paymentLinkId: payosLink.paymentLinkId,
                payosDescription: payosLink.description,
                payosAccount: payosLink.accountNumber,
              },
            },
          }).catch((err) => console.warn("Lỗi lưu paymentGatewayResponse:", err));
        }
      } catch (payosErr: any) {
        console.warn("⚠️ [PAYOS CREATE LINK ERROR] Không thể tạo Payment Link trên PayOS (dùng VietQR fallback):", payosErr?.message || payosErr);
      }
    }

    // Sinh ảnh VietQR Napas 247 tương ứng
    vietQrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankIdentifier)}-${encodeURIComponent(bankAccountNumber)}-compact2.png?amount=${numericAmount}&addInfo=${encodeURIComponent(vietQrContent)}&accountName=${encodeURIComponent(bankAccountName)}`;

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
        methodName: "Chuyển khoản Ngân hàng (VietQR Napas 247 - MBBank)",
        bankName,
        accountNumber: bankAccountNumber,
        accountName: bankAccountName,
        amount: numericAmount,
        content: vietQrContent,
        qrCodeUrl: vietQrUrl,
        checkoutUrl: payosCheckoutUrl,
        instructions: `Mở ứng dụng Mobile Banking của bạn, chọn 'Quét mã QR' và quét mã trên, hoặc chuyển khoản đến STK ${bankAccountNumber} (${bankName}) với nội dung: ${vietQrContent}`,
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
      input.paymentGatewayResponse || { simulated: true, note: input.note || "Thanh toán mô phỏng thành công" },
      actor.userId
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
    await auditService.write({
        userId,
        action,
        entityName: "Donation",
        entityId: donation.id,
      }, tx);
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
      await auditService.write({
          userId: actor.userId,
          action: "DEMO_FULL_REFUND",
          entityName: "Donation",
          entityId: donation.id,
        }, tx);

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

      await auditService.write({
          userId: actor.userId,
          action: "CANCEL_CAMPAIGN",
          entityName: "Campaign",
          entityId: campaignId,
        }, tx);

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
   * Xác thực chữ ký số HMAC-SHA256 chuẩn PayOS
   */
  private verifyPayOsSignature(data: Record<string, any>, signature: string, checksumKey: string): boolean {
    try {
      const sortedKeys = Object.keys(data).sort();
      const queryStr = sortedKeys
        .filter((k) => data[k] !== undefined && data[k] !== null)
        .map((k) => `${k}=${data[k]}`)
        .join("&");
      const hmac = crypto.createHmac("sha256", checksumKey).update(queryStr).digest("hex");
      return hmac === signature;
    } catch {
      return false;
    }
  }

  /**
   * Xử lý Webhook tự động biến động số dư ngân hàng (PayOS / SePay / Casso / Banking Webhook)
   * Tự động xác minh nhận đúng số tiền từ mã QR và hoàn tất giao dịch tức thời.
   */
  async handleBankingWebhook(payload: any) {
    // 1. payOS bọc dữ liệu trong payload.data, SePay/Casso có thể gửi trực tiếp ở payload
    const data = payload?.data || payload || {};

    const content = String(
      data.content ||
      data.description ||
      data.transferContent ||
      data.transactionCode ||
      data.orderCode ||
      payload.content ||
      payload.description ||
      ""
    );

    // 2. Xử lý gói tin ping/xác nhận Webhook URL của payOS (chứa VQRIO hoặc orderCode mẫu 123 hoặc desc xác nhận)
    if (
      content.includes("VQRIO") ||
      data.orderCode === 123 ||
      payload.desc === "Webhook URL confirmation" ||
      payload.message === "Webhook URL confirmation"
    ) {
      console.log("✓ [PAYOS WEBHOOK] Đã phản hồi xác nhận URL Webhook thành công với máy chủ PayOS.");
      return {
        success: true,
        message: "Xác nhận Webhook URL payOS thành công",
      };
    }

    // 3. Kiểm tra chữ ký số bảo mật của PayOS (nếu có cấu hình PAYOS_CHECKSUM_KEY trong .env)
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (checksumKey && payload.signature && payload.data) {
      const isSignatureValid = this.verifyPayOsSignature(payload.data, payload.signature, checksumKey);
      if (!isSignatureValid) {
        console.error("❌ [PAYOS WEBHOOK] Chữ ký số HMAC-SHA256 không hợp lệ!");
        return {
          success: false,
          message: "Chữ ký số Webhook PayOS không hợp lệ",
        };
      }
    }

    // 4. Tìm kiếm khoản đóng góp:
    let donation: any = null;

    // 4.1 Ưu tiên tìm theo orderCode của PayOS (nếu có)
    const orderCode = Number(data.orderCode || payload.orderCode || 0);
    if (orderCode > 0) {
      try {
        donation = await prisma.donation.findFirst({
          where: {
            paymentGatewayResponse: {
              path: "$.orderCode",
              equals: orderCode,
            },
          },
          include: { campaign: true },
        });
      } catch {
        donation = null;
      }
      if (donation) {
        console.log(`✓ [PAYOS WEBHOOK] Khớp thành công khoản đóng góp qua orderCode #${orderCode}: ${donation.transactionCode}`);
      }
    }

    // 4.2 Nếu chưa tìm thấy theo orderCode, trích xuất mã giao dịch từ nội dung chuyển khoản
    if (!donation) {
      const cleanNoFT = content.replace(/^FT\s*/i, "").trim();
      const uuidMatch = cleanNoFT.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      const donMatch = cleanNoFT.match(/(DON[- ]?[0-9]{6}[- ]?[A-Z0-9]+)/i) || cleanNoFT.match(/(DON[- ]?[A-Z0-9-]+)/i);
      const transactionCode = uuidMatch ? uuidMatch[1] : donMatch ? donMatch[1] : cleanNoFT;

      if (transactionCode) {
        donation = await this.repo.findByTransactionCode(transactionCode);
        if (!donation && content !== transactionCode) {
          donation = await this.repo.findByTransactionCode(content);
        }
      }
    }

    // 4.3 Fallback quét 50 giao dịch gần nhất để khớp theo orderCode hoặc tiền tố mã giao dịch
    if (!donation) {
      const recentDonations = await prisma.donation.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
        include: { campaign: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      donation = recentDonations.find((d) => {
        const gw = (d.paymentGatewayResponse as any) || {};
        if (orderCode > 0 && (Number(gw.orderCode) === orderCode || String(gw.orderCode) === String(orderCode))) return true;
        const normDb = d.transactionCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        const cleanContent = content.replace(/^FT\s*/i, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (cleanContent.length >= 6 && (normDb.includes(cleanContent) || cleanContent.includes(normDb))) return true;
        return false;
      }) || null;

      if (donation) {
        console.log(`✓ [PAYOS WEBHOOK] Khớp thành công khoản đóng góp qua quét danh sách gần nhất: ${donation.transactionCode}`);
      }
    }

    if (!donation) {
      return { success: false, message: `Không tìm thấy khoản quyên góp với mã: ${content}` };
    }

    // Nếu giao dịch đã được thanh toán thành công trước đó (Idempotent response)
    if (donation.paymentStatus === PaymentStatus.SUCCESS) {
      return { success: true, message: "Giao dịch đã được thanh toán thành công trước đó", donation };
    }

    // 5. KIỂM TRA NHẬN ĐÚNG TIỀN TỪ MÃ QR:
    // So sánh số tiền thực nhận qua ngân hàng với số tiền yêu cầu của khoản đóng góp
    const transferAmount = Number(
      data.amount || data.transferAmount || payload.transferAmount || payload.amount || 0
    );
    const requiredAmount = Number(donation.amount);

    if (transferAmount > 0 && transferAmount < requiredAmount) {
      console.warn(
        `⚠ [PAYOS WEBHOOK] Số tiền chuyển ${transferAmount} đ nhỏ hơn số tiền quyên góp yêu cầu ${requiredAmount} đ cho mã ${donation.transactionCode}`
      );
      return {
        success: false,
        message: `Số tiền chuyển khoản (${transferAmount.toLocaleString("vi-VN")} đ) chưa đủ số tiền quyên góp yêu cầu (${requiredAmount.toLocaleString("vi-VN")} đ)`,
        donation,
      };
    }

    // Nếu tiền thực tế đã vào tài khoản ngân hàng, hệ thống chấp nhận hoàn tất giao dịch
    // (kể cả khi quá 10 phút, nhằm bảo vệ tiền và quyền lợi của nhà hảo tâm)

    // 6. Xác nhận thanh toán thành công vào hệ thống
    const result = await this.repo.confirmPayment(donation.id, {
      gateway: data.gateway || payload.gateway || "PAYOS",
      referenceCode:
        data.reference ||
        data.referenceCode ||
        payload.referenceCode ||
        data.paymentLinkId ||
        payload.id ||
        null,
      transferAmount: transferAmount > 0 ? transferAmount : requiredAmount,
      note: `Xác nhận tự động qua Webhook biến động số dư ngân hàng PayOS (MBBank ${process.env.BANK_ACCOUNT_NUMBER || "0344907168"})`,
    });

    console.log(
      `✅ [PAYOS WEBHOOK] Đã xác nhận thành công khoản đóng góp ${result.donation.transactionCode}: +${(transferAmount > 0 ? transferAmount : requiredAmount).toLocaleString("vi-VN")} đ`
    );

    await invalidatePublicCampaignCache();

    // 7. Gửi email biên nhận tự động tới người đóng góp
    this.sendReceiptEmailSafely(result.donation);

    return {
      success: true,
      message: "Đã xác nhận thanh toán thành công qua Webhook ngân hàng PayOS",
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
