import { Prisma } from "@prisma/client";
import { AppError } from "../../core/errors/app.error";
import { pageMeta, skipOf } from "../../core/utils/pagination.util";
import {
  notificationRepository,
  NotificationRepository,
} from "./notification.repository";
import type { NotificationQueryInput } from "./notification.validation";
import { assertObjectAccess } from "../../core/auth/object-access";

/** Chỉ cho phép đường dẫn nội bộ (một dấu "/" đầu) để tránh open-redirect. */
export function safeInternalLink(value?: string | null): string | null {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export class NotificationService {
  constructor(private repo: NotificationRepository = notificationRepository) {}

  async list(userId: string, query: NotificationQueryInput) {
    const { items, total } = await this.repo.list(
      userId,
      query.unreadOnly,
      skipOf(query.page, query.limit),
      query.limit,
    );
    const unread = await this.repo.countUnread(userId);
    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
        link: safeInternalLink(n.linkUrl),
      })),
      meta: { ...pageMeta(query.page, query.limit, total), unread },
    };
  }

  async unreadCount(userId: string) {
    return { unread: await this.repo.countUnread(userId) };
  }

  async markRead(userId: string, role: string, id: string) {
    const notification = await this.repo.findById(id);
    if (!notification) throw new AppError("Không tìm thấy thông báo", 404);

    await assertObjectAccess({
      actor: { userId, role },
      ownerId: notification.userId,
      entityName: "Notification",
      entityId: id,
      allowAdmin: false,
      message: "Bạn không có quyền đánh dấu thông báo của người khác",
    });

    await this.repo.markRead(userId, id);
    return { id, isRead: true };
  }

  async markAllRead(userId: string) {
    return { updated: await this.repo.markAllRead(userId) };
  }

  /** Dùng nội bộ bởi module khác (reports, communities...). Có thể chạy trong transaction. */
  notify(
    data: {
      userId: string;
      title: string;
      message: string;
      type: string;
      link?: string | null;
    },
    db?: Prisma.TransactionClient,
  ) {
    return this.repo.create(
      {
        userId: data.userId,
        title: data.title.slice(0, 255),
        message: data.message,
        type: data.type.slice(0, 50),
        linkUrl: safeInternalLink(data.link),
      },
      db,
    );
  }
}

export const notificationService = new NotificationService();
