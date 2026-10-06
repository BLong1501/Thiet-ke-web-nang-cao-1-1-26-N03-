import { userRepository, UserRepository } from "./user.repository";
import { UserQueryInput, UpdateUserStatusInput } from "./user.validation";
import { prisma } from "../../core/database/prisma";

export class UserService {
  constructor(private repo: UserRepository = userRepository) {}

  async getUsersList(query: UserQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search } },
        { email: { contains: query.search } },
        { phoneNumber: { contains: query.search } },
      ];
    }

    const orderBy: any = { [query.sortBy]: query.sortOrder };

    const [items, total] = await Promise.all([
      this.repo.findUsers(where, orderBy, skip, limit),
      this.repo.countUsers(where),
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

  async getUserDetail(id: string) {
    const user = await this.repo.findByIdWithDetails(id);
    if (!user) {
      const error: any = new Error("Người dùng không tồn tại trong hệ thống");
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  async updateUserStatus(id: string, input: UpdateUserStatusInput, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const error: any = new Error("Người dùng không tồn tại");
      error.statusCode = 404;
      throw error;
    }

    if (user.id === adminId) {
      const error: any = new Error("Không thể tự thay đổi trạng thái tài khoản của chính mình");
      error.statusCode = 400;
      throw error;
    }

    const updatedUser = await this.repo.updateStatus(id, input.status);

    // Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "UPDATE_USER_STATUS",
        entityName: "User",
        entityId: id,
        details: {
          previousStatus: user.status,
          newStatus: input.status,
          reason: input.reason,
        },
      },
    });

    return {
      message: `Cập nhật trạng thái người dùng sang "${input.status}" thành công`,
      user: updatedUser,
    };
  }
}

export const userService = new UserService();
