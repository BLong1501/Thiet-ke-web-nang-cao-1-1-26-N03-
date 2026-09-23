import bcrypt from "bcrypt";
import { profileRepository, ProfileRepository } from "./profile.repository";
import { UpdateProfileInput, ChangePasswordInput } from "./profile.validation";

export class ProfileService {
  constructor(private repo: ProfileRepository = profileRepository) {}

  async getMyProfile(userId: string) {
    const profile = await this.repo.getProfileWithStats(userId);
    if (!profile) {
      const error: any = new Error("Không tìm thấy thông tin người dùng");
      error.statusCode = 404;
      throw error;
    }
    return profile;
  }

  async updateMyProfile(userId: string, input: UpdateProfileInput) {
    // Nếu cập nhật số điện thoại, phải kiểm tra SĐT này đã có ai dùng chưa
    if (input.phoneNumber) {
      const existingPhone = await this.repo.findByPhoneExcludingUser(input.phoneNumber, userId);
      if (existingPhone) {
        const error: any = new Error("Số điện thoại này đã được liên kết với một tài khoản khác trong hệ thống");
        error.statusCode = 409;
        throw error;
      }
    }

    const updatedUser = await this.repo.updateProfile(userId, input);

    return {
      message: "Cập nhật thông tin trang cá nhân thành công!",
      user: updatedUser,
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.repo.findUserWithPassword(userId);
    if (!user) {
      const error: any = new Error("Không tìm thấy tài khoản người dùng");
      error.statusCode = 404;
      throw error;
    }

    // Nếu tài khoản đã có mật khẩu (tài khoản đăng ký thường) -> Bắt buộc kiểm tra mật khẩu cũ
    if (user.passwordHash) {
      if (!input.oldPassword) {
        const error: any = new Error("Vui lòng nhập mật khẩu hiện tại của bạn");
        error.statusCode = 400;
        throw error;
      }

      const isMatch = await bcrypt.compare(input.oldPassword, user.passwordHash);
      if (!isMatch) {
        const error: any = new Error("Mật khẩu hiện tại không chính xác");
        error.statusCode = 400;
        throw error;
      }
    }

    // Băm mật khẩu mới và lưu
    const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
    await this.repo.updatePassword(userId, newPasswordHash);

    return {
      message: user.passwordHash
        ? "Đổi mật khẩu thành công!"
        : "Thiết lập mật khẩu riêng cho tài khoản Google thành công!",
    };
  }
}

export const profileService = new ProfileService();
