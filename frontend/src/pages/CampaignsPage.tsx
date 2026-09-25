import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CampaignCard } from '../components/ui/CampaignCard';
import { SearchBar } from '../components/ui/SearchBar';
import { CategoryFilter } from '../components/ui/CategoryFilter';
import { mockCampaigns } from '../data/mockData';
import type { CampaignCategory } from '../types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'most-funded', label: 'Được ủng hộ nhiều nhất' },
  { value: 'deadline', label: 'Sắp hết hạn' },
  { value: 'trending', label: 'Đang hot 🔥' },
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
    document.title = 'Khám phá Chiến dịch - FundVN';
  }, []);

  // Filter campaigns
  const filtered = mockCampaigns.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.shortDesc.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || c.category === category;
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filtered.length / 6);
  const paginated = filtered.slice((page - 1) * 6, page * 6);

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        padding: '60px 0 40px',
        background: 'linear-gradient(135deg, #0a0a14, #1a0a2e)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ position: 'relative' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: 12, textAlign: 'center' }}>
            Khám phá <span className="text-gradient">chiến dịch</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32 }}>
            {filtered.length} chiến dịch đang chờ sự ủng hộ của bạn
          </p>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <SearchBar
              large
              onSearch={(q) => { setSearch(q); setPage(1); }}
              placeholder="Tìm kiếm chiến dịch..."
            />
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 24px' }}>
        {/* Filters row */}
        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          marginBottom: 28,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CategoryFilter
              selected={category}
              onChange={(cat) => { setCategory(cat); setPage(1); }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '9px 14px',
                background: 'rgba(26,26,46,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'var(--font-body)',
              }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* View toggle */}
            <div style={{
              display: 'flex',
              background: 'rgba(26,26,46,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              {['grid', 'list'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as 'grid' | 'list')}
                  style={{
                    padding: '9px 12px',
                    background: viewMode === mode ? 'rgba(124,58,237,0.3)' : 'transparent',
                    border: 'none',
                    color: viewMode === mode ? 'var(--primary-400)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mode === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Hiển thị <strong style={{ color: 'var(--text-primary)' }}>{paginated.length}</strong> / {filtered.length} chiến dịch
          </span>
        </div>

        {/* Campaign grid */}
        {paginated.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(3, 1fr)' : '1fr',
            gap: 22,
            marginBottom: 40,
          }}>
            {paginated.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'rgba(26,26,46,0.4)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-xl)',
            marginBottom: 40,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8 }}>Không tìm thấy chiến dịch</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Thử thay đổi từ khóa hoặc danh mục tìm kiếm
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '9px 16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(26,26,46,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                color: page === 1 ? 'var(--text-disabled)' : 'var(--text-secondary)',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              ← Trước
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                style={{
                  width: 40, height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: page === i + 1 ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(26,26,46,0.8)',
                  border: page === i + 1 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: page === i + 1 ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: page === i + 1 ? 700 : 400,
                  fontFamily: 'var(--font-body)',
                  boxShadow: page === i + 1 ? '0 4px 14px rgba(124,58,237,0.35)' : 'none',
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '9px 16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(26,26,46,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                color: page === totalPages ? 'var(--text-disabled)' : 'var(--text-secondary)',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .campaigns-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .campaigns-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default CampaignsPage;
