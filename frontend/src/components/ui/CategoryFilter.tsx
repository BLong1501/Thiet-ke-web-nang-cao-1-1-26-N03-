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
              border: `1.5px solid ${isActive ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              background: isActive
                ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                : 'rgba(26,26,46,0.6)',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              fontWeight: isActive ? 700 : 500,
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
              backdropFilter: 'blur(8px)',
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
