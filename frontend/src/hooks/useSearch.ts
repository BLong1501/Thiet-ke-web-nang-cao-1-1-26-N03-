import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface UseSearchOptions {
  debounceMs?: number;
  syncWithUrl?: boolean;
}

/**
 * Hook quản lý tìm kiếm, lọc, phân trang — đồng bộ URL query params
 */
export function useSearch<T extends Record<string, any>>(
  initialFilters: T,
  options: UseSearchOptions = {}
) {
  const { debounceMs = 400, syncWithUrl = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Khởi tạo state từ URL params nếu syncWithUrl
  const getInitialState = (): T => {
    if (!syncWithUrl) return { ...initialFilters };
    const merged = { ...initialFilters } as Record<string, any>;
    searchParams.forEach((value, key) => {
      if (key in merged) {
        const orig = merged[key];
        if (typeof orig === 'number') {
          const parsed = Number(value);
          merged[key] = isNaN(parsed) ? orig : parsed;
        } else {
          merged[key] = value;
        }
      }
    });
    return merged as T;
  };

  const [filters, setFilters] = useState<T>(getInitialState);
  const [searchInput, setSearchInput] = useState<string>(
    syncWithUrl ? (searchParams.get('search') || '') : (initialFilters.search || '')
  );

  // Đồng bộ filter lên URL
  const syncToUrl = useCallback(
    (newFilters: T) => {
      if (!syncWithUrl) return;
      const params: Record<string, string> = {};
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== (initialFilters as any)[k]) {
          params[k] = String(v);
        }
      });
      setSearchParams(params, { replace: true });
    },
    [syncWithUrl, setSearchParams, initialFilters]
  );

  // Cập nhật một field filter (reset về page 1)
  const setFilter = useCallback(
    (key: keyof T, value: any) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value, page: 1 } as T;
        syncToUrl(next);
        return next;
      });
    },
    [syncToUrl]
  );

  // Xử lý thay đổi input tìm kiếm có debounce
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters((prev) => {
          const next = { ...prev, search: value, page: 1 } as T;
          syncToUrl(next);
          return next;
        });
      }, debounceMs);
    },
    [debounceMs, syncToUrl]
  );

  // Đổi trang
  const setPage = useCallback(
    (page: number) => {
      setFilters((prev) => {
        const next = { ...prev, page } as T;
        syncToUrl(next);
        return next;
      });
    },
    [syncToUrl]
  );

  // Reset tất cả filters về giá trị ban đầu
  const resetFilters = useCallback(() => {
    setFilters({ ...initialFilters });
    setSearchInput(initialFilters.search || '');
    if (syncWithUrl) setSearchParams({}, { replace: true });
  }, [initialFilters, syncWithUrl, setSearchParams]);

  // Cleanup debounce khi unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    filters,
    searchInput,
    setFilter,
    setPage,
    handleSearchChange,
    resetFilters,
  };
}
