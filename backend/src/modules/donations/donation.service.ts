import { Prisma } from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { AppError } from '../../core/errors/app.error';
import { donationRepository as repo } from './donation.repository';
import { CreateDonationInput } from './donation.validation';

type Actor = { userId: string; role: string };
const stateError = (message: string) => new AppError(message, 422);

export class DonationService {
  private async actor(tx: Prisma.TransactionClient, actor: Actor, admin = false) {
    const user = await tx.user.findUnique({ where: { id: actor.userId } });
    if (!user || user.status !== 'ACTIVE' || !user.isEmailVerified) throw new AppError('Tài khoản không được phép thực hiện thao tác', 403);
    if (admin && user.role !== 'ADMIN') throw new AppError('Chỉ quản trị viên được thực hiện thao tác', 403);
    return user;
  }

  async create(actor: Actor, input: CreateDonationInput) {
    return repo.transaction(async tx => {
      const user = await this.actor(tx, actor);
      const campaign = await repo.lockCampaign(tx, input.campaignId);
      if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);
      const existing = await tx.donation.findUnique({ where: { transactionCode: input.requestKey } });
      if (existing) {
        if (existing.donorId !== user.id || existing.campaignId !== input.campaignId || !existing.amount.equals(input.amount)
          || existing.isAnonymous !== input.isAnonymous || (existing.message ?? '') !== (input.message ?? '')) {
          throw new AppError('requestKey đã dùng cho yêu cầu khác', 409);
        }
        return { donation: existing, replayed: true };
      }
      const now = new Date();
      if (campaign.status !== 'ACTIVE' || now < campaign.startDate || now >= campaign.endDate) {
        throw stateError('Chiến dịch không ở thời gian/trạng thái nhận đóng góp');
      }
      const donation = await tx.donation.create({ data: {
        campaignId: campaign.id, donorId: user.id, donorName: user.fullName, donorEmail: user.email,
        transactionCode: input.requestKey, amount: new Prisma.Decimal(input.amount),
        message: input.message, isAnonymous: input.isAnonymous, paymentMethod: 'BANK_TRANSFER', paymentStatus: 'PENDING',
      } });
      return { donation, replayed: false };
    }).catch(error => {
      if (error.code === 'P2002') throw new AppError('requestKey đang được dùng; gửi lại cùng nội dung để lấy kết quả', 409);
      throw error;
    });
  }

  // All money-changing operations lock campaign first, then donation: one lock order.
  private async locked<T>(id: string, action: (tx: Prisma.TransactionClient, campaign: any, donation: any) => Promise<T>) {
    return repo.transaction(async tx => {
      const ref = await tx.donation.findUnique({ where: { id }, select: { campaignId: true } });
      if (!ref) throw new AppError('Không tìm thấy khoản đóng góp', 404);
      const campaign = await repo.lockCampaign(tx, ref.campaignId);
      const donation = await repo.lockDonation(tx, id);
      if (!campaign || !donation) throw new AppError('Không tìm thấy dữ liệu', 404);
      return action(tx, campaign, donation);
    });
  }

  async confirm(actor: Actor, id: string) {
    // This is explicitly a demo, never a trusted payment gateway callback.
    if (!['development', 'test'].includes(process.env.NODE_ENV ?? '')) {
      throw new AppError('Xác nhận thanh toán mô phỏng chỉ dùng trong development/test', 403);
    }
    return this.locked(id, async (tx, campaign, donation) => {
      await this.actor(tx, actor, true);
      if (donation.paymentStatus !== 'PENDING') throw stateError('Chỉ xác nhận khoản đóng góp đang PENDING');
      const now = new Date();
      if (campaign.status !== 'ACTIVE' || now < campaign.startDate || now >= campaign.endDate) throw stateError('Chiến dịch không còn nhận tiền');
      await tx.ledgerEntry.create({ data: { donationId: id, kind: 'RECEIPT', amount: donation.amount } });
      const updated = await tx.donation.update({ where: { id }, data: { paymentStatus: 'SUCCESS', paidAt: now } });
      const totals = await repo.refreshCampaign(tx, campaign.id);
      await this.record(tx, actor.userId, donation, 'DEMO_PAYMENT_CONFIRMED', 'Đã ghi nhận đóng góp mô phỏng');
      return { donation: updated, totals, simulated: true };
    });
  }

  async refund(actor: Actor, id: string, reason: string) {
    return this.locked(id, async (tx, campaign, donation) => {
      const user = await this.actor(tx, actor);
      if (user.role !== 'ADMIN' && donation.donorId !== user.id) throw new AppError('Bạn không sở hữu khoản đóng góp này', 403);
      if (donation.paymentStatus !== 'SUCCESS') throw stateError('Chỉ hoàn khoản SUCCESS chưa được hoàn tiền');
      const totals = await repo.totals(tx, campaign.id);
      // Use gross receipts to decide failed funding; refunds must not change that decision.
      const failed = new Date() >= campaign.endDate && totals.received.lessThan(campaign.targetAmount);
      if (campaign.status !== 'CANCELLED' && !failed) throw stateError('Chỉ hoàn khi chiến dịch bị hủy hoặc hết hạn không đạt mục tiêu');
      if (await tx.disbursement.count({ where: { campaignId: campaign.id } })) throw stateError('Chiến dịch đã giải ngân cần quy trình đối soát riêng');
      await tx.ledgerEntry.create({ data: { donationId: id, kind: 'REFUND', amount: donation.amount } });
      const updated = await tx.donation.update({ where: { id }, data: { paymentStatus: 'REFUNDED' } });
      const after = await repo.refreshCampaign(tx, campaign.id);
      await this.record(tx, user.id, donation, 'DEMO_FULL_REFUND', reason);
      return { donation: updated, totals: after, simulated: true };
    });
  }

  async cancelCampaign(actor: Actor, campaignId: string, reason: string) {
    return repo.transaction(async tx => {
      await this.actor(tx, actor, true);
      const campaign = await repo.lockCampaign(tx, campaignId);
      if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);
      if (!['ACTIVE', 'PAUSED'].includes(campaign.status)) throw stateError('Chỉ hủy chiến dịch ACTIVE hoặc PAUSED');
      if (await tx.disbursement.count({ where: { campaignId } })) throw stateError('Không hủy chiến dịch đã giải ngân');
      const result = await tx.campaign.update({ where: { id: campaignId }, data: { status: 'CANCELLED' } });
      await tx.auditLog.create({ data: { userId: actor.userId, action: 'CANCEL_CAMPAIGN', entityName: 'Campaign', entityId: campaignId, details: { reason } } });
      return result;
    });
  }

  async detail(actor: Actor, id: string) {
    return repo.transaction(async tx => {
      const user = await this.actor(tx, actor);
      const donation = await tx.donation.findUnique({ where: { id }, include: { ledgerEntries: true } });
      if (!donation) throw new AppError('Không tìm thấy khoản đóng góp', 404);
      if (user.role !== 'ADMIN' && donation.donorId !== user.id) throw new AppError('Bạn không sở hữu khoản đóng góp này', 403);
      return donation;
    });
  }

  async reconcile(actor: Actor, campaignId: string) {
    return repo.transaction(async tx => {
      await this.actor(tx, actor, true);
      const campaign = await repo.lockCampaign(tx, campaignId);
      if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);
      const totals = await repo.totals(tx, campaignId);
      return { campaignId, ...totals, cachedAmount: campaign.currentAmount, matches: totals.net.equals(campaign.currentAmount) };
    });
  }

  async expireCampaigns() {
    return prisma.campaign.updateMany({ where: { status: { in: ['ACTIVE', 'PAUSED'] }, endDate: { lte: new Date() } }, data: { status: 'COMPLETED' } });
  }

  private async record(tx: Prisma.TransactionClient, userId: string, donation: any, action: string, message: string) {
    await tx.auditLog.create({ data: { userId, action, entityName: 'Donation', entityId: donation.id, details: { amount: donation.amount.toString(), message, simulated: true } } });
    if (donation.donorId) await tx.notification.create({ data: { userId: donation.donorId, title: 'Đóng góp kiểm thử Buổi 6', message, type: action } });
  }
}
export const donationService = new DonationService();
