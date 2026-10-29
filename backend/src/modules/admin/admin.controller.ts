import { Request, Response, NextFunction } from "express";
import { CampaignStatus, PaymentStatus, ReportStatus, VerificationStatus } from "@prisma/client";
import prisma from "../../core/database/prisma";
import { sendSuccess } from "../../core/utils/response.util";

export const getAdminPendingCounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Pending campaigns
    const pendingCampaignsPromise = prisma.campaign.findMany({
      where: { status: CampaignStatus.PENDING_APPROVAL },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        beneficiaryInfo: true,
      },
    });

    // 2. Closure requests (stored in beneficiaryInfo)
    const closureCampaignsPromise = prisma.campaign.findMany({
      where: {
        beneficiaryInfo: {
          contains: '"closureRequest"',
        },
      },
      select: {
        beneficiaryInfo: true,
      },
    });

    // 3. Disbursements
    const disbursementsPromise = prisma.disbursement.findMany({
      select: {
        note: true,
      },
    });

    // 4. Refund requests
    const refundsPromise = prisma.donation.count({
      where: {
        paymentStatus: PaymentStatus.SUCCESS,
        paymentGatewayResponse: {
          path: "$.refundRequest.status",
          equals: "PENDING",
        },
      },
    });

    // 5. KYC Verifications
    const verificationsPromise = prisma.verification.count({
      where: {
        status: VerificationStatus.PENDING,
      },
    });

    // 6. Reports
    const reportsPromise = prisma.report.count({
      where: {
        status: ReportStatus.PENDING,
      },
    });

    const [
      pendingCampaigns,
      closureCampaigns,
      disbursements,
      refunds,
      verifications,
      reports,
    ] = await Promise.all([
      pendingCampaignsPromise,
      closureCampaignsPromise,
      disbursementsPromise,
      refundsPromise,
      verificationsPromise,
      reportsPromise,
    ]);

    // Phân loại chiến dịch chờ duyệt: tạo mới vs chỉnh sửa
    let pendingNew = 0;
    let pendingEdited = 0;
    for (const c of pendingCampaigns) {
      let isEdited = false;
      try {
        if (c.beneficiaryInfo) {
          const meta = typeof c.beneficiaryInfo === "string" ? JSON.parse(c.beneficiaryInfo) : c.beneficiaryInfo;
          isEdited = Boolean(meta?.isEdited);
        }
      } catch {
        // Bỏ qua lỗi parse JSON nếu có
      }
      if (!isEdited && c.updatedAt && c.createdAt) {
        isEdited = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 10000;
      }
      if (isEdited) {
        pendingEdited++;
      } else {
        pendingNew++;
      }
    }

    // Yêu cầu đóng sớm
    let closureRequests = 0;
    for (const c of closureCampaigns) {
      try {
        if (c.beneficiaryInfo) {
          const meta = typeof c.beneficiaryInfo === "string" ? JSON.parse(c.beneficiaryInfo) : c.beneficiaryInfo;
          if (meta?.closureRequest?.status === "PENDING") {
            closureRequests++;
          }
        }
      } catch {
        // Bỏ qua lỗi parse JSON
      }
    }

    // Hồ sơ giải ngân chờ phê duyệt
    let pendingDisbursements = 0;
    for (const d of disbursements) {
      const note = d.note || "";
      if (!/\[TRẠNG THÁI:\s*(APPROVED|REJECTED)\]/i.test(note)) {
        pendingDisbursements++;
      }
    }

    const campaignTotal = pendingNew + pendingEdited + closureRequests;
    const total = campaignTotal + pendingDisbursements + refunds + verifications + reports;

    return sendSuccess(res, 200, "Lấy số lượng yêu cầu chờ phê duyệt thành công", {
      campaigns: {
        total: campaignTotal,
        pendingNew,
        pendingEdited,
        closureRequests,
      },
      disbursements: pendingDisbursements,
      refunds,
      verifications,
      reports,
      total,
    });
  } catch (error) {
    next(error);
  }
};
