import { UserRole, VerificationStatus } from "@prisma/client";
import { verificationRepository, VerificationRepository } from "./verification.repository";
import { SubmitVerificationInput, ReviewVerificationInput } from "./verification.validation";
import { authRepository, AuthRepository } from "../auth/auth.repository";

export class VerificationService {
  constructor(
    private repo: VerificationRepository = verificationRepository,
    private userRepo: AuthRepository = authRepository
  ) {}

  async submitVerification(userId: string, input: SubmitVerificationInput) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      const error: any = new Error("Tài khoản người dùng không tồn tại");
      error.statusCode = 404;
      throw error;
    }

    if (user.role === UserRole.FUNDRAISER) {
      const error: any = new Error(
        "Tài khoản của bạn đã là Người gây quỹ (Fundraiser). Không cần nộp lại hồ sơ xác minh."
      );
      error.statusCode = 400;
      throw error;
    }

    if (user.role === UserRole.ADMIN) {
      const error: any = new Error("Tài khoản Quản trị viên (Admin) không cần thực hiện xác minh gây quỹ.");
      error.statusCode = 400;
      throw error;
    }

    const existingVerification = await this.repo.findByUserId(userId);

    const cardIssuedDate = input.cardIssuedDate ? new Date(input.cardIssuedDate) : undefined;

    // Trường hợp đã nộp đơn trước đó
    if (existingVerification) {
      if (existingVerification.status === VerificationStatus.PENDING) {
        const error: any = new Error(
          "Hồ sơ của bạn đang trong quá trình xét duyệt. Vui lòng kiên nhẫn chờ quản trị viên phản hồi."
        );
        error.statusCode = 400;
        throw error;
      }

      if (existingVerification.status === VerificationStatus.APPROVED) {
        const error: any = new Error("Hồ sơ xác minh của bạn đã được phê duyệt thành công từ trước.");
        error.statusCode = 400;
        throw error;
      }

      // Trường hợp bị REJECTED -> Cho phép người dùng cập nhật lại thông tin mới để gửi xét duyệt lại
      const updated = await this.repo.update(existingVerification.id, {
        idCardNumber: input.idCardNumber,
        cardIssuedDate,
        cardIssuedPlace: input.cardIssuedPlace,
        frontCardImage: input.frontCardImage,
        backCardImage: input.backCardImage,
        portraitImage: input.portraitImage,
        supportingDocuments: input.supportingDocuments,
        status: VerificationStatus.PENDING,
        rejectionReason: null,
      });

      return {
        message: "Hồ sơ của bạn đã được cập nhật và gửi lại để xét duyệt thành công!",
        verification: updated,
      };
    }

    // Trường hợp nộp lần đầu tiên
    const newVerification = await this.repo.create({
      userId,
      idCardNumber: input.idCardNumber,
      cardIssuedDate,
      cardIssuedPlace: input.cardIssuedPlace,
      frontCardImage: input.frontCardImage,
      backCardImage: input.backCardImage,
      portraitImage: input.portraitImage,
      supportingDocuments: input.supportingDocuments,
    });

    return {
      message: "Hồ sơ đăng ký gây quỹ (KYC) đã được nộp thành công! Vui lòng chờ quản trị viên xét duyệt.",
      verification: newVerification,
    };
  }

  async getMyVerificationStatus(userId: string) {
    const verification = await this.repo.findByUserId(userId);
    if (!verification) {
      return {
        hasSubmitted: false,
        status: null,
        verification: null,
      };
    }

    return {
      hasSubmitted: true,
      status: verification.status,
      verification,
    };
  }

  async getPendingVerifications(page = 1, limit = 10) {
    return this.repo.findPendingList(page, limit);
  }

  async getVerificationDetail(id: string) {
    const verification = await this.repo.findById(id);
    if (!verification) {
      const error: any = new Error("Không tìm thấy hồ sơ xác minh với mã ID này");
      error.statusCode = 404;
      throw error;
    }
    return verification;
  }

  async reviewVerification(adminId: string, verificationId: string, input: ReviewVerificationInput) {
    const verification = await this.repo.findById(verificationId);
    if (!verification) {
      const error: any = new Error("Không tìm thấy hồ sơ xác minh");
      error.statusCode = 404;
      throw error;
    }

    if (verification.status !== VerificationStatus.PENDING) {
      const error: any = new Error(
        `Hồ sơ này đã được xử lý trước đó với trạng thái: ${verification.status}. Không thể xét duyệt lại.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (input.status === VerificationStatus.APPROVED) {
      const result = await this.repo.approveAndUpgradeRole(verificationId, verification.userId, adminId);
      return {
        message: `Đã phê duyệt hồ sơ thành công! Người dùng ${result.user.fullName} (${result.user.email}) đã được nâng cấp lên vai trò FUNDRAISER.`,
        verification: result.verification,
        user: result.user,
      };
    } else {
      const updated = await this.repo.rejectVerification(
        verificationId,
        verification.userId,
        adminId,
        input.rejectionReason!
      );
      return {
        message: "Đã từ chối hồ sơ đăng ký gây quỹ.",
        verification: updated,
      };
    }
  }
}

export const verificationService = new VerificationService();
