import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/core/database/prisma";

async function cleanJunkData() {
  console.log("Bắt đầu dọn dẹp tài khoản rác và chiến dịch rác trên DB Aiven...");

  // 1. Tìm các tài khoản rác (chứa test.security hoặc brute_victim_)
  const junkUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "test.security" } },
        { email: { contains: "brute_victim" } },
      ],
    },
    select: { id: true, email: true },
  });

  const junkUserIds = junkUsers.map((u) => u.id);
  console.log(`Tìm thấy ${junkUsers.length} tài khoản rác:`, junkUsers.map((u) => u.email));

  // 2. Tìm các chiến dịch rác (Tiêu đề an toàn hoặc Victim Campaign)
  const junkCampaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { title: { contains: "Victim Campaign" } },
        { title: { contains: "Tiêu đề an toàn" } },
        { fundraiserId: { in: junkUserIds } },
      ],
    },
    select: { id: true, title: true },
  });

  const junkCampaignIds = junkCampaigns.map((c) => c.id);
  console.log(`Tìm thấy ${junkCampaigns.length} chiến dịch rác:`, junkCampaigns.map((c) => c.title));

  if (junkCampaignIds.length > 0) {
    // Xóa donations và ledger liên quan đến chiến dịch rác
    const junkDonations = await prisma.donation.findMany({
      where: { campaignId: { in: junkCampaignIds } },
      select: { id: true },
    });
    const junkDonationIds = junkDonations.map((d) => d.id);

    if (junkDonationIds.length > 0) {
      await (prisma as any).ledgerEntry.deleteMany({
        where: { donationId: { in: junkDonationIds } },
      });
      await prisma.donation.deleteMany({
        where: { id: { in: junkDonationIds } },
      });
      console.log(`✓ Đã xóa ${junkDonationIds.length} khoản quyên góp test liên quan.`);
    }

    // Xóa media, updates của chiến dịch rác
    await prisma.campaignMedia.deleteMany({
      where: { campaignId: { in: junkCampaignIds } },
    });
    await prisma.campaignUpdate.deleteMany({
      where: { campaignId: { in: junkCampaignIds } },
    });

    // Xóa chiến dịch rác
    await prisma.campaign.deleteMany({
      where: { id: { in: junkCampaignIds } },
    });
    console.log(`✓ Đã xóa ${junkCampaignIds.length} chiến dịch rác.`);
  }

  if (junkUserIds.length > 0) {
    // Xóa audit logs, notifications, verifications liên quan đến user rác
    await prisma.auditLog.deleteMany({
      where: { userId: { in: junkUserIds } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: junkUserIds } },
    });
    await prisma.verification.deleteMany({
      where: { userId: { in: junkUserIds } },
    });

    // Xóa user rác
    await prisma.user.deleteMany({
      where: { id: { in: junkUserIds } },
    });
    console.log(`✓ Đã xóa ${junkUserIds.length} tài khoản rác thành công.`);
  }

  // 3. Kiểm tra lại dữ liệu còn lại sau khi dọn dẹp
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true },
  });
  const remainingCampaigns = await prisma.campaign.findMany({
    select: { id: true, title: true, status: true, fundraiser: { select: { fullName: true, email: true } } },
  });

  console.log("\n==========================================");
  console.log("  KẾT QUẢ DỌN DẸP CƠ SỞ DỮ LIỆU AIVEN");
  console.log("==========================================");
  console.log(`Còn lại ${remainingUsers.length} tài khoản sạch:`);
  remainingUsers.forEach((u) => console.log(` - [${u.role}] ${u.fullName} (${u.email})`));

  console.log(`\nCòn lại ${remainingCampaigns.length} chiến dịch sạch:`);
  remainingCampaigns.forEach((c) =>
    console.log(` - [${c.status}] "${c.title}" (Tạo bởi: ${c.fundraiser?.fullName} - ${c.fundraiser?.email})`)
  );
  console.log("==========================================\n");
}

cleanJunkData()
  .catch((err) => {
    console.error("Lỗi dọn dẹp:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
