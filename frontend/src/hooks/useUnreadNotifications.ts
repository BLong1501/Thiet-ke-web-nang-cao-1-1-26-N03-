import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "../services/api";

export const UNREAD_KEY = ["notifications", "unread"] as const;

/**
 * Số thông báo chưa đọc cho huy hiệu trên Navbar.
 * - Chỉ chạy khi đã đăng nhập (`enabled`).
 * - Lỗi (API chưa sẵn sàng/mạng) coi như 0 để không phá giao diện; không retry.
 * - Làm mới mỗi 60s khi tab đang hiển thị.
 */
export function useUnreadNotifications(enabled: boolean): number {
  const { data } = useQuery({
    queryKey: UNREAD_KEY,
    enabled,
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const res = await notificationApi.list({ page: 1, limit: 1 });
      const unread = Number(res.data?.meta?.unread);
      return Number.isFinite(unread) && unread > 0 ? unread : 0;
    },
  });
  return enabled ? (data ?? 0) : 0;
}
