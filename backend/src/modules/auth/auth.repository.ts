import { prisma } from "../../core/database/prisma";
import { User, AuthProvider } from "@prisma/client";

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<Omit<User, "passwordHash"> | null> {
    return prisma.user.findUnique({
      where: { id },
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
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { phoneNumber },
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { googleId },
    });
  }

  async createUser(data: {
    email: string;
    passwordHash?: string | null;
    fullName: string;
    phoneNumber?: string | null;
    googleId?: string | null;
    avatarUrl?: string | null;
    authProvider?: AuthProvider;
    isEmailVerified?: boolean;
    emailVerifiedAt?: Date | null;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber || null,
        googleId: data.googleId || null,
        avatarUrl: data.avatarUrl || null,
        authProvider: data.authProvider || AuthProvider.LOCAL,
        isEmailVerified: data.isEmailVerified || false,
        emailVerifiedAt: data.emailVerifiedAt || null,
      },
    });
  }

  async markEmailVerified(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async linkGoogleAccount(userId: string, googleId: string, avatarUrl?: string | null): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        isEmailVerified: true, // Google email luôn được Google chứng thực
        emailVerifiedAt: new Date(),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });
  }
}

export const authRepository = new AuthRepository();
