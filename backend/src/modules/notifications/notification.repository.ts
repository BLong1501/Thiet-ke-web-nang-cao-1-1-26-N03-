import { Prisma } from "@prisma/client";
import { prisma } from "../../core/database/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export class NotificationRepository {
  async list(userId: string, unreadOnly: boolean, skip: number, take: number) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);
    return { items, total };
  }

  countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  }

  /** Điều kiện `userId` nằm trong where để chặn IDOR: chỉ đánh dấu thông báo của chính mình. */
  async markRead(userId: string, id: string) {
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return result.count;
  }

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  create(
    data: {
      userId: string;
      title: string;
      message: string;
      type: string;
      linkUrl?: string | null;
    },
    db: Db = prisma,
  ) {
    return db.notification.create({ data });
  }
}

export const notificationRepository = new NotificationRepository();
