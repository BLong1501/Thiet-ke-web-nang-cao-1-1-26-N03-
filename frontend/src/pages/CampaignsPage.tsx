import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CampaignCard } from '../components/ui/CampaignCard';
import { SearchBar } from '../components/ui/SearchBar';
import { CategoryFilter } from '../components/ui/CategoryFilter';
import { mockCampaigns } from '../data/mockData';
import type { CampaignCategory } from '../types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'most-funded', label: 'Ủng hộ nhiều nhất' },
  { value: 'deadline', label: 'Sắp hết hạn' },
  { value: 'trending', label: 'Đang nổi bật 🔥' },
];

const CampaignsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState<CampaignCategory | 'all'>(
    (searchParams.get('category') as CampaignCategory) || 'all'
  );
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    document.title = 'Khám phá Chiến dịch - FundTrust';
  }, []);

  // Filter campaigns
  const filtered = mockCampaigns.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.shortDesc.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || c.category === category;
    return matchSearch && matchCategory;
  });

  // Sort campaigns
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'most-funded') return b.raisedAmount - a.raisedAmount;
    if (sortBy === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (sortBy === 'trending') return b.donorCount - a.donorCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const itemsPerPage = 6;
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleCategoryChange = (cat: CampaignCategory | 'all') => {
    setCategory(cat);
    setPage(1);
    if (cat === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', cat);
    }
    setSearchParams(searchParams);
  };

  const handleSearchChange = (q: string) => {
    setSearch(q);
    setPage(1);
    if (q) searchParams.set('search', q);
    else searchParams.delete('search');
    setSearchParams(searchParams);
  };

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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--primary-fixed)', borderRadius: 20, color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 12 }}>
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
          <p style={{ color: 'var(--on-surface-variant)', maxWidth: 580, margin: '0 auto 28px', fontSize: '0.9375rem', lineHeight: 1.6 }}>
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
            <CategoryFilter selected={category} onChange={handleCategoryChange} />
          </div>

          {/* Right: Sort & Layout */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              aria-label="Sắp xếp chiến dịch"
              onChange={(e) => {
                setSortBy(e.target.value);
                searchParams.set('sort', e.target.value);
                setSearchParams(searchParams);
              }}
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
            Tìm thấy <strong style={{ color: 'var(--on-surface)' }}>{sorted.length}</strong> chiến dịch phù hợp
            {category !== 'all' && ` trong danh mục đã chọn`}
            {search && ` với từ khóa "${search}"`}
          </span>
          {(category !== 'all' || search) && (
            <button
              type="button"
              onClick={() => {
                setCategory('all');
                setSearch('');
                searchParams.delete('category');
                searchParams.delete('search');
                setSearchParams(searchParams);
              }}
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
              onClick={() => {
                setCategory('all');
                setSearch('');
              }}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                color: page === 1 ? 'var(--outline)' : 'var(--on-surface)',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              ← Trước
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i + 1)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: page === i + 1 ? 'var(--primary-container)' : 'var(--surface-container-lowest)',
                  border: page === i + 1 ? 'none' : '1px solid var(--outline-variant)',
                  color: page === i + 1 ? '#fff' : 'var(--on-surface)',
                  cursor: 'pointer',
                  fontWeight: page === i + 1 ? 700 : 500,
                  fontSize: '0.875rem',
                  boxShadow: page === i + 1 ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                color: page === totalPages ? 'var(--outline)' : 'var(--on-surface)',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignsPage;
