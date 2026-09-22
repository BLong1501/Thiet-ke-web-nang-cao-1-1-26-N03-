import { prisma } from "../../core/database/prisma";
import { Verification, VerificationStatus, UserRole } from "@prisma/client";

export class VerificationRepository {
  async findByUserId(userId: string): Promise<Verification | null> {
    return prisma.verification.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.verification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            role: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async create(data: {
    userId: string;
    idCardNumber: string;
    cardIssuedDate?: Date;
    cardIssuedPlace?: string;
    frontCardImage: string;
    backCardImage: string;
    portraitImage: string;
    supportingDocuments?: any;
  }): Promise<Verification> {
    return prisma.verification.create({
      data: {
        userId: data.userId,
        idCardNumber: data.idCardNumber,
        cardIssuedDate: data.cardIssuedDate,
        cardIssuedPlace: data.cardIssuedPlace,
        frontCardImage: data.frontCardImage,
        backCardImage: data.backCardImage,
        portraitImage: data.portraitImage,
        supportingDocuments: data.supportingDocuments ?? undefined,
        status: VerificationStatus.PENDING,
      },
    });
  }

  async update(
    id: string,
    data: {
      idCardNumber?: string;
      cardIssuedDate?: Date;
      cardIssuedPlace?: string;
      frontCardImage?: string;
      backCardImage?: string;
      portraitImage?: string;
      supportingDocuments?: any;
      status?: VerificationStatus;
      rejectionReason?: string | null;
    }
  ): Promise<Verification> {
    return prisma.verification.update({
      where: { id },
      data,
    });
  }

  async findPendingList(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, items] = await prisma.$transaction([
      prisma.verification.count({
        where: { status: VerificationStatus.PENDING },
      }),
      prisma.verification.findMany({
        where: { status: VerificationStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" }, // Hồ sơ nộp trước được duyệt trước (FIFO)
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
              role: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveAndUpgradeRole(verificationId: string, userId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái hồ sơ KYC thành APPROVED
      const updatedVerification = await tx.verification.update({
        where: { id: verificationId },
        data: {
          status: VerificationStatus.APPROVED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      // 2. Nâng cấp vai trò của người dùng thành FUNDRAISER
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role: UserRole.FUNDRAISER,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
        },
      });

      // 3. Tạo thông báo tự động cho người dùng
      await tx.notification.create({
        data: {
          userId,
          title: "Chúc mừng! Hồ sơ gây quỹ của bạn đã được duyệt",
          message:
            "Tài khoản của bạn đã được nâng cấp lên vai trò Người gây quỹ (Fundraiser). Bạn có thể bắt đầu tạo chiến dịch ngay bây giờ.",
          type: "VERIFICATION_APPROVED",
        },
      });

      return {
        verification: updatedVerification,
        user: updatedUser,
      };
    });
  }

  async rejectVerification(verificationId: string, userId: string, adminId: string, reason: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Cập nhật hồ sơ thành REJECTED kèm lý do
      const updatedVerification = await tx.verification.update({
        where: { id: verificationId },
        data: {
          status: VerificationStatus.REJECTED,
          rejectionReason: reason,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // 2. Tạo thông báo lý do từ chối cho người dùng
      await tx.notification.create({
        data: {
          userId,
          title: "Hồ sơ đăng ký gây quỹ bị từ chối",
          message: `Rất tiếc, hồ sơ của bạn chưa được duyệt với lý do: "${reason}". Vui lòng cập nhật lại thông tin để được xét duyệt lại.`,
          type: "VERIFICATION_REJECTED",
        },
      });

      return updatedVerification;
    });
  }
}

export const verificationRepository = new VerificationRepository();
