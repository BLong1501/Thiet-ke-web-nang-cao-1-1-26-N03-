import { prisma } from "../../core/database/prisma";
import { Prisma, UserStatus } from "@prisma/client";

export class UserRepository {
  async findUsers(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput,
    skip: number,
    take: number
  ) {
    return prisma.user.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        _count: {
          select: {
            campaigns: true,
            donations: true,
          },
        },
      },
    });
  }

  async countUsers(where: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  async findByIdWithDetails(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        bio: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        verification: true,
        campaigns: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            targetAmount: true,
            currentAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        donations: {
          where: { paymentStatus: "SUCCESS" },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            campaign: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  }

  async updateStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
  }
}

export const userRepository = new UserRepository();
