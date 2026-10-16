import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/core/database/prisma";

async function deleteAllCampaigns() {
  console.log("Bắt đầu xóa toàn bộ chiến dịch trên Cơ sở dữ liệu Aiven...");

  // 1. Lấy toàn bộ chiến dịch hiện có
  const allCampaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      fundraiser: {
        select: { fullName: true, email: true },
      },
    },
  });

  if (allCampaigns.length === 0) {
    console.log("Không có chiến dịch nào trong cơ sở dữ liệu.");
    process.exit(0);
  }

  console.log(`Tìm thấy ${allCampaigns.length} chiến dịch cần xóa:`);
  allCampaigns.forEach((c, index) => {
    console.log(`  ${index + 1}. [${c.status}] "${c.title}" (Tạo bởi: ${c.fundraiser.fullName} - ${c.fundraiser.email})`);
  });

  const campaignIds = allCampaigns.map((c) => c.id);

  // 2. Tìm và xóa các dữ liệu phụ thuộc
  // a. Donations & Ledger entries
  const donations = await prisma.donation.findMany({
    where: { campaignId: { in: campaignIds } },
    select: { id: true },
  });
  const donationIds = donations.map((d) => d.id);

  if (donationIds.length > 0) {
    const deletedLedger = await (prisma as any).ledgerEntry.deleteMany({
      where: { donationId: { in: donationIds } },
    });
    console.log(`✓ Đã xóa ${deletedLedger.count} bản ghi sổ cái (ledger entries).`);

    const deletedDonations = await prisma.donation.deleteMany({
      where: { id: { in: donationIds } },
    });
    console.log(`✓ Đã xóa ${deletedDonations.count} khoản quyên góp (donations).`);
  }

  // b. Disbursements (giải ngân)
  const deletedDisbursements = await prisma.disbursement.deleteMany({
    where: { campaignId: { in: campaignIds } },
  });
  if (deletedDisbursements.count > 0) {
    console.log(`✓ Đã xóa ${deletedDisbursements.count} bản ghi giải ngân (disbursements).`);
  }

  // c. Comments
  const deletedComments = await prisma.comment.deleteMany({
    where: { campaignId: { in: campaignIds } },
  });
  if (deletedComments.count > 0) {
    console.log(`✓ Đã xóa ${deletedComments.count} bình luận liên quan.`);
  }

  // d. Community Posts liên quan tới campaign (nếu có)
  const deletedPosts = await prisma.communityPost.deleteMany({
    where: { campaignId: { in: campaignIds } },
  });
  if (deletedPosts.count > 0) {
    console.log(`✓ Đã xóa ${deletedPosts.count} bài viết cộng đồng liên quan.`);
  }

  // e. Campaign Media & Updates
  await prisma.campaignMedia.deleteMany({
    where: { campaignId: { in: campaignIds } },
  });
  await prisma.campaignUpdate.deleteMany({
    where: { campaignId: { in: campaignIds } },
  });

  // 3. Xóa các chiến dịch
  const deletedCampaigns = await prisma.campaign.deleteMany({
    where: { id: { in: campaignIds } },
  });
  console.log(`✓ Đã xóa thành công ${deletedCampaigns.count} chiến dịch.`);

  // 4. Kiểm tra lại số lượng còn lại
  const remainingCount = await prisma.campaign.count();
  console.log(`==========================================`);
  console.log(`HOÀN TẤT: Hiện còn ${remainingCount} chiến dịch trong cơ sở dữ liệu.`);
  console.log(`==========================================`);
}

deleteAllCampaigns()
  .catch((e) => {
    console.error("Lỗi khi xóa chiến dịch:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
