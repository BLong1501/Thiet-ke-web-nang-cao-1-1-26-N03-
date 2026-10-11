import crypto from "crypto";
import { donationRepository, DonationRepository } from "./donation.repository";
import { prisma } from "../../core/database/prisma";
import { CampaignStatus, PaymentMethod, PaymentStatus, UserRole, Prisma } from "@prisma/client";
import { CreateDonationInput, ConfirmDonationInput, DonationQueryInput } from "./donation.validation";
import { AppError } from "../../core/errors/app.error";

export class DonationService {
  constructor(private repo: DonationRepository = donationRepository) {}

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
      const existing = await this.repo.findByRequestKey(input.requestKey);
      if (existing) {
        if (Number(existing.amount) !== input.amount || existing.campaignId !== input.campaignId) {
          throw new AppError("requestKey đã được sử dụng với nội dung quyên góp khác", 409);
        }
        return {
          replayed: true,
          message: "Yêu cầu quyên góp đã được khởi tạo từ trước (Idempotent Replay)",
          donation: existing,
          paymentInstructions: this.buildPaymentInstructions(campaign, existing.amount, existing.transactionCode, existing.id),
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

    // 4. Tạo mã giao dịch đối soát duy nhất (e.g., DON-261007-AB12)
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const transactionCode = `DON-${datePrefix}-${randomSuffix}`;

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

    // 6. Tạo hướng dẫn thanh toán chi tiết (VietQR hoặc MoMo)
    const paymentInstructions = this.buildPaymentInstructions(campaign, input.amount, transactionCode, donation.id);

    return {
      replayed: false,
      message: "Khởi tạo yêu cầu quyên góp thành công. Vui lòng quét mã QR hoặc chuyển khoản để hoàn tất.",
      donation,
      paymentInstructions,
    };
  }

  /**
   * Tạo chi tiết hướng dẫn thanh toán: VietQR Ngân hàng & Mã QR Ví MoMo
   */
  private buildPaymentInstructions(campaign: any, amount: number | Prisma.Decimal, transactionCode: string, donationId: string) {
    const numericAmount = Number(amount);
    const bankName = campaign.bankName || "Vietcombank";
    const bankAccountNumber = campaign.bankAccountNumber || "123456789";
    const bankAccountName = campaign.bankAccountName || "QUY GAY QUY CONG DONG";

    // 1. VietQR ngân hàng chuẩn Napas 247
    const vietQrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankName)}-${encodeURIComponent(bankAccountNumber)}-compact2.png?amount=${numericAmount}&addInfo=${encodeURIComponent(transactionCode)}&accountName=${encodeURIComponent(bankAccountName)}`;

    // 2. Ví MoMo
    const momoPhone = "0987654321"; // Số ví MoMo nhận quyên góp của hệ thống / quỹ
    const momoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=2|99|${momoPhone}|${encodeURIComponent(bankAccountName)}||0|0|${numericAmount}|${encodeURIComponent(transactionCode)}|transfer_p2p`;
    const momoDeepLink = `momo://?action=payWithApp&isScanQR=true`;

    return {
      transactionCode,
      amount: numericAmount,
      currency: "VND",
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
        accountName: bankAccountName,
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
  async confirmPayment(donationId: string, input: ConfirmDonationInput) {
    const donation = await this.repo.findById(donationId);
    if (!donation) {
      throw new AppError("Không tìm thấy giao dịch quyên góp", 404);
    }

    if (donation.paymentStatus === PaymentStatus.SUCCESS) {
      return {
        message: "Giao dịch này đã được xác nhận thanh toán thành công từ trước",
        donation,
      };
    }

    if (donation.paymentStatus !== PaymentStatus.PENDING) {
      throw new AppError("Giao dịch không ở trạng thái chờ thanh toán", 400);
    }

    const result = await this.repo.confirmPayment(
      donationId,
      input.paymentGatewayResponse || { simulated: true, note: input.note || "Thanh toán mô phỏng thành công" }
    );

    return {
      message: "Xác nhận thanh toán quyên góp thành công! Đã gửi thông báo và cập nhật tiến độ chiến dịch.",
      donation: result.donation,
      campaignProgress: result.campaignProgress,
    };
  }

  /**
   * Admin xác nhận thanh toán mô phỏng (Endpoint confirm-demo phục vụ kiểm thử Buổi 6)
   */
  async confirmDemo(actor: { userId: string; role: string }, donationId: string) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Điểm cuối kiểm thử mô phỏng bị vô hiệu hóa trên môi trường production", 403);
    }
    return this.confirmPayment(donationId, { note: "Admin confirm-demo" });
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

      if (user.role !== UserRole.ADMIN && donation.donorId !== user.id) {
        throw new AppError("Bạn không có quyền sở hữu khoản đóng góp này", 403);
      }

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
          action: "REFUND_DONATION",
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
  async getCampaignDonations(campaignId: string, page = 1, limit = 10) {
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

    return {
      items: formattedItems,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
    const donation = await this.repo.findById(donationId);
    if (!donation) {
      throw new AppError("Không tìm thấy giao dịch quyên góp", 404);
    }

    const isOwner = currentUserId && donation.donorId === currentUserId;
    const isFundraiser = currentUserId && (donation as any).campaign?.fundraiserId === currentUserId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (donation.isAnonymous && !isOwner && !isFundraiser && !isAdmin) {
      return {
        ...donation,
        donorName: "Nhà hảo tâm ẩn danh",
        donorEmail: null,
        donorPhone: null,
        donor: null,
      };
    }

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
}

export const donationService = new DonationService();
