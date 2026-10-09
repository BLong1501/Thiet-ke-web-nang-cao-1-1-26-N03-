import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
}

/**
 * Component phân trang dùng chung — hiển thị thông minh với dấu "..."
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  showInfo = true,
}) => {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  /**
   * Tạo dãy số trang: [1, ..., prev, curr, next, ..., last]
   * với dấu "..." biểu diễn bằng null
   */
  const buildPageRange = (): (number | null)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const range: (number | null)[] = [];
    const delta = 2;

    range.push(1);

    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    if (left > 2) range.push(null); // left ellipsis

    for (let i = left; i <= right; i++) range.push(i);

    if (right < totalPages - 1) range.push(null); // right ellipsis

    range.push(totalPages);

    return range;
  };

  const pages = buildPageRange();

  return (
    <div className="pagination-wrapper">
      {showInfo && (
        <p className="pagination-info">
          Hiển thị <strong>{from}–{to}</strong> trong tổng số <strong>{total}</strong> kết quả
        </p>
      )}
      <nav className="pagination-nav" aria-label="Phân trang">
        {/* Nút trang trước */}
        <button
          id="pagination-prev"
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Trang trước"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Các nút số trang */}
        {pages.map((page, idx) =>
          page === null ? (
            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
              &hellip;
            </span>
          ) : (
            <button
              key={page}
              id={`pagination-page-${page}`}
              className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
              aria-label={`Trang ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* Nút trang sau */}
        <button
          id="pagination-next"
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Trang sau"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
