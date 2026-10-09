import React, { useState, useEffect, useMemo } from 'react';
import { CampaignCard } from '../components/ui/CampaignCard';
import { SearchBar } from '../components/ui/SearchBar';
import { CategoryFilter } from '../components/ui/CategoryFilter';
import Pagination from '../components/ui/Pagination';
import { useSearch } from '../hooks/useSearch';
import { campaignApi } from '../services/api';
import { mockCampaigns } from '../data/mockData';
import type { Campaign, CampaignCategory } from '../types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'most-funded', label: 'Ủng hộ nhiều nhất' },
  { value: 'deadline', label: 'Sắp hết hạn' },
  { value: 'trending', label: 'Đang nổi bật 🔥' },
];

const ITEMS_PER_PAGE = 6;

const CampaignsPage: React.FC = () => {
  // Quản lý state Tìm kiếm, Lọc, Phân trang qua Custom Hook useSearch (Đồng bộ URL Params)
  const {
    filters,
    searchInput,
    handleSearchChange,
    setFilter,
    setPage,
    resetFilters,
  } = useSearch<{
    search: string;
    category: CampaignCategory | 'all';
    sort: string;
    page: number;
    limit: number;
  }>({
    search: '',
    category: 'all',
    sort: 'newest',
    page: 1,
    limit: ITEMS_PER_PAGE,
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [apiCampaigns, setApiCampaigns] = useState<Campaign[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Khám phá Chiến dịch - FundTrust';
  }, []);

  // Gọi API Backend nếu có kết nối, nếu không sẽ dùng mockCampaigns
  useEffect(() => {
    let isMounted = true;
    const fetchFromApi = async () => {
      try {
        setLoading(true);
        const res = await campaignApi.getAll({
          search: filters.search || undefined,
          status: 'ACTIVE',
        });
        if (isMounted && res.data?.data?.items && res.data.data.items.length > 0) {
          // Chuẩn hóa dữ liệu API thành type Campaign
          const mapped: Campaign[] = res.data.data.items.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.story || item.shortDescription,
            shortDesc: item.shortDescription || item.title,
            category: (item.category?.slug || 'cong-dong') as CampaignCategory,
            targetAmount: Number(item.targetAmount),
            raisedAmount: Number(item.currentAmount),
            donorCount: item.donorCount || 0,
            deadline: item.endDate,
            status: (item.status?.toLowerCase() || 'active') as any,
            creator: {
              id: item.fundraiser?.id || '1',
              name: item.fundraiser?.fullName || 'Người gây quỹ',
              email: item.fundraiser?.email || '',
              avatar: item.fundraiser?.avatarUrl || 'https://i.pravatar.cc/150?img=1',
              role: 'fundraiser',
              isVerified: true,
              joinedAt: item.createdAt,
            },
            thumbnail: item.coverImageUrl || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));
          setApiCampaigns(mapped);
        } else {
          setApiCampaigns(null); // Sử dụng mockCampaigns
        }
      } catch (err) {
        setApiCampaigns(null); // Fallback mockCampaigns
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFromApi();
    return () => {
      isMounted = false;
    };
  }, [filters.search]);

  // Bộ dữ liệu nguồn (API kết hợp Mock Data)
  const dataSource = useMemo(() => {
    if (apiCampaigns && apiCampaigns.length > 0) {
      // Kết hợp các campaign từ API và mock data không trùng ID
      const apiIds = new Set(apiCampaigns.map((c) => c.id));
      const nonDuplicateMock = mockCampaigns.filter((c) => !apiIds.has(c.id));
      return [...apiCampaigns, ...nonDuplicateMock];
    }
    return mockCampaigns;
  }, [apiCampaigns]);

  // Bộ lọc dữ liệu
  const filtered = useMemo(() => {
    return dataSource.filter((c) => {
      const matchSearch =
        !filters.search ||
        c.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        c.shortDesc.toLowerCase().includes(filters.search.toLowerCase());
      const matchCategory = filters.category === 'all' || c.category === filters.category;
      return matchSearch && matchCategory;
    });
  }, [dataSource, filters.search, filters.category]);

  // Sắp xếp dữ liệu
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (filters.sort === 'most-funded') return b.raisedAmount - a.raisedAmount;
      if (filters.sort === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (filters.sort === 'trending') return b.donorCount - a.donorCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filtered, filters.sort]);

  // Phân trang
  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const currentPage = Math.min(filters.page || 1, Math.max(1, totalPages));
  const paginated = useMemo(() => {
    return sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header Banner */}
      <div
        style={{
          padding: '52px 0 36px',
          background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--background) 100%)',
          borderBottom: '1px solid var(--outline-variant)',
        }}
      >
        <div className="container" style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: 'var(--primary-fixed)',
              borderRadius: 20,
              color: 'var(--primary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            <span>🌱</span> Khám phá & Kết nối cộng đồng
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              color: 'var(--on-surface)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: 10,
            }}
          >
            Các chiến dịch gây quỹ <span style={{ color: 'var(--primary-container)' }}>minh bạch</span>
          </h1>
          <p
            style={{
              color: 'var(--on-surface-variant)',
              maxWidth: 580,
              margin: '0 auto 28px',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
            }}
          >
            100% chiến dịch được xác minh danh tính và công khai sao kê thu chi theo thời gian thực.
          </p>
          <div style={{ maxWidth: 620, margin: '0 auto' }}>
            <SearchBar
              large
              placeholder="Tìm theo tên hoàn cảnh, địa phương hoặc người gây quỹ..."
              onSearch={handleSearchChange}
            />
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '36px var(--gutter)' }}>
        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          {/* Category Pills */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <CategoryFilter
              selected={filters.category || 'all'}
              onChange={(cat) => setFilter('category', cat)}
            />
          </div>

          {/* Right: Sort & Layout */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {/* Sort Dropdown */}
            <select
              value={filters.sort || 'newest'}
              aria-label="Sắp xếp chiến dịch"
              onChange={(e) => setFilter('sort', e.target.value)}
              style={{
                padding: '9px 14px',
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 10,
                color: 'var(--on-surface)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'var(--font-body)',
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* View Mode */}
            <div
              style={{
                display: 'flex',
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '8px 12px',
                    background: viewMode === mode ? 'var(--primary-fixed)' : 'transparent',
                    border: 'none',
                    color: viewMode === mode ? 'var(--primary)' : 'var(--outline)',
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                    transition: 'all 0.15s ease',
                  }}
                  title={mode === 'grid' ? 'Dạng lưới' : 'Dạng danh sách'}
                >
                  {mode === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results summary & Active tag info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Tìm thấy <strong style={{ color: 'var(--on-surface)' }}>{totalItems}</strong> chiến dịch phù hợp
            {filters.category !== 'all' && ` trong danh mục đã chọn`}
            {filters.search && ` với từ khóa "${filters.search}"`}
          </span>
          {(filters.category !== 'all' || filters.search) && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>

        {/* Campaigns Grid / List */}
        {paginated.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr',
              gap: 24,
              marginBottom: 44,
            }}
          >
            {paginated.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '72px 24px',
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-xl)',
              marginBottom: 40,
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: 'var(--on-surface)' }}>
              Không tìm thấy chiến dịch phù hợp
            </h3>
            <p style={{ margin: '0 0 20px', color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
              Hãy thử tìm kiếm với từ khóa khác hoặc xóa bớt tiêu chí lọc danh mục.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--primary-container)',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Xem tất cả chiến dịch
            </button>
          </div>
        )}

        {/* Reusable Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          total={totalItems}
          limit={ITEMS_PER_PAGE}
          onPageChange={setPage}
          showInfo={true}
        />
      </div>
    </div>
  );
};

export default CampaignsPage;
