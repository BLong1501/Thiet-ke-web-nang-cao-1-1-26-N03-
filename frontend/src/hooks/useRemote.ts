import { useId, useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { errorMessage, httpStatus } from "../services/platform";

interface RemoteOptions {
  /**
   * Khoá cache dùng chung giữa các component (vd. "categories").
   * Mặc định mỗi component có vùng cache riêng, an toàn khi `dependencies`
   * không bao phủ hết các biến mà loader dùng.
   */
  key?: string;
  /**
   * Giữ dữ liệu cũ trong lúc tải dữ liệu mới. CHỈ bật cho danh sách phân trang;
   * không bật cho trang chi tiết vì sẽ hiện nhầm dữ liệu của bản ghi trước.
   */
  keepPrevious?: boolean;
  /** Thời gian dữ liệu được coi là mới (ms). */
  staleTime?: number;
}

/**
 * Lớp tương thích mỏng trên TanStack Query: giữ nguyên hợp đồng
 * `{ data, loading, error, reload }` mà các trang đang dùng, và bổ sung
 * `fetching` (đang tải lại ngầm) cùng cache, khử trùng lặp request, retry mạng.
 */
export function useRemote<T>(
  loader: () => Promise<T>,
  dependencies: unknown[] = [],
  options: RemoteOptions = {},
) {
  const instanceId = useId();
  const latest = useRef(loader);
  latest.current = loader;

  const query = useQuery<T, unknown>({
    queryKey: ["remote", options.key ?? instanceId, ...dependencies],
    queryFn: () => latest.current(),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    staleTime: options.staleTime,
  });

  const failed = query.isError && !query.isFetching;
  return {
    data: (query.data ?? null) as T | null,
    // Chỉ coi là "đang tải" khi chưa có dữ liệu để hiển thị.
    loading: query.isLoading || (query.isError && query.isFetching),
    fetching: query.isFetching,
    error: failed ? errorMessage(query.error) : "",
    /** Mã HTTP của lần tải lỗi gần nhất; `undefined` khi không lỗi hoặc lỗi mạng. */
    status: failed ? httpStatus(query.error) : undefined,
    reload: () => {
      void query.refetch();
    },
  };
}
