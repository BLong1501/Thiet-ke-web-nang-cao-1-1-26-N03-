import React from 'react';
import type { CampaignCategory } from '../../types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../types';

interface CategoryFilterProps {
  selected: CampaignCategory | 'all';
  onChange: (category: CampaignCategory | 'all') => void;
}

const categories: Array<{ key: CampaignCategory | 'all'; label: string; icon: string }> = [
  { key: 'all', label: 'Tất cả', icon: '🌟' },
  ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    key: key as CampaignCategory,
    label,
    icon: CATEGORY_ICONS[key as CampaignCategory],
  })),
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onChange }) => {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
    }}>
      {categories.map(({ key, label, icon }) => {
        const isActive = selected === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${isActive ? 'var(--primary-container)' : 'var(--outline-variant)'}`,
              background: isActive
                ? 'var(--primary-container)'
                : 'var(--surface-container-lowest)',
              color: isActive ? '#ffffff' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              transition: 'all 0.18s ease',
              boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.25)' : 'var(--shadow-xs)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--outline)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-lowest)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--outline-variant)';
              }
            }}
          >
            <span style={{ fontSize: '1rem' }}>{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
