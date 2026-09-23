import { prisma } from "../../core/database/prisma";
import { User } from "@prisma/client";

export class ProfileRepository {
  async getProfileWithStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        bio: true,
        googleId: true,
        authProvider: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        verification: {
          select: {
            id: true,
            status: true,
            rejectionReason: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            campaigns: true,
            donations: true,
          },
        },
      },
    });

    return user;
  }

  async findByPhoneExcludingUser(phoneNumber: string, currentUserId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        phoneNumber,
        id: { not: currentUserId },
      },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      phoneNumber?: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
        ...(data.bio !== undefined ? { bio: data.bio || null } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        bio: true,
        googleId: true,
        authProvider: true,
        role: true,
        status: true,
        isEmailVerified: true,
        updatedAt: true,
      },
    });
  }

  async findUserWithPassword(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        authProvider: true,
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}

export const profileRepository = new ProfileRepository();
