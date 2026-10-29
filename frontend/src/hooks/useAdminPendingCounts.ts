import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminPendingCounts } from "../services/api";
import { useAuthStore } from "../store/authStore";

export const ADMIN_PENDING_QUERY_KEY = ["admin", "pending-counts"];

export function useAdminPendingCounts() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  return useQuery<AdminPendingCounts>({
    queryKey: ADMIN_PENDING_QUERY_KEY,
    queryFn: () => adminApi.getPendingCounts(),
    enabled: isAdmin,
    staleTime: 10_000,
    refetchInterval: 15_000, // Tự động làm mới mỗi 15 giây để cập nhật trạng thái mới nhất
    refetchOnWindowFocus: true,
  });
}

export function useInvalidatePendingCounts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_QUERY_KEY });
  };
}
