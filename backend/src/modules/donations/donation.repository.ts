import { Prisma } from '@prisma/client';
import { prisma } from '../../core/database/prisma';

export class DonationRepository {
  transaction<T>(action: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(action, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 60000, timeout: 30000,
    });
  }

  async lockCampaign(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${id} FOR UPDATE`;
    return tx.campaign.findUnique({ where: { id } });
  }

  async lockDonation(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM donations WHERE id = ${id} FOR UPDATE`;
    return tx.donation.findUnique({ where: { id } });
  }

  async totals(tx: Prisma.TransactionClient, campaignId: string) {
    const rows = await tx.ledgerEntry.groupBy({
      by: ['kind'], where: { donation: { campaignId } }, _sum: { amount: true }, _count: true,
    });
    const received = rows.find(r => r.kind === 'RECEIPT')?._sum.amount ?? new Prisma.Decimal(0);
    const refunded = rows.find(r => r.kind === 'REFUND')?._sum.amount ?? new Prisma.Decimal(0);
    return { received, refunded, net: received.minus(refunded) };
  }

  async refreshCampaign(tx: Prisma.TransactionClient, campaignId: string) {
    const totals = await this.totals(tx, campaignId);
    const donors = await tx.donation.findMany({
      where: { campaignId, paymentStatus: 'SUCCESS' }, select: { donorId: true }, distinct: ['donorId'],
    });
    // Cache only: overwritten from the ledger, never incremented from request input.
    await tx.campaign.update({ where: { id: campaignId }, data: { currentAmount: totals.net, donorCount: donors.length } });
    return totals;
  }
}

export const donationRepository = new DonationRepository();
