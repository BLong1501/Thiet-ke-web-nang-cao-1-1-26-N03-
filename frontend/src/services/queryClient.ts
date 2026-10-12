import { QueryClient } from "@tanstack/react-query";

/** Chỉ thử lại khi lỗi mạng/5xx (tối đa 1 lần); 4xx là lỗi nghiệp vụ, không thử lại. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  return status === undefined || status >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
  },
});
