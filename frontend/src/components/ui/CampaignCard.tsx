import React from 'react';
import { Link } from 'react-router-dom';
import type { Campaign } from '../../types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../types';
import { formatCurrency, getDaysLeft, getProgress } from '../../services/api';

interface CampaignCardProps {
  campaign: Campaign;
  featured?: boolean;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, featured = false }) => {
  const [hovered, setHovered] = React.useState(false);
  const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);
  const daysLeft = getDaysLeft(campaign.deadline);
  const isUrgent = daysLeft <= 7 && daysLeft > 0;
  const isCompleted = progress >= 100;

  const categoryColors: Record<string, string> = {
    'y-te': '#dc2626', 'giao-duc': '#d97706', 'moi-truong': '#059669',
    'cuu-tro': '#2563eb', 'dong-vat': '#7c3aed', 'cong-dong': '#0891b2',
    'sang-tao': '#db2777', 'khac': '#64748b',
  };
  const catColor = categoryColors[campaign.category] || '#64748b';

  return (
    <Link to={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--surface-container-lowest)',
          border: `1px solid ${hovered ? 'var(--primary-fixed-dim)' : 'var(--outline-variant)'}`,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', overflow: 'hidden', height: featured ? 220 : 192 }}>
          <img
            src={campaign.thumbnail}
            alt={campaign.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.45s ease',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />
          {/* Subtle bottom gradient */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(19,27,46,0.35) 0%, transparent 55%)',
          }} />

          {/* Category badge */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${catColor}30`,
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
            color: catColor,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{CATEGORY_ICONS[campaign.category]}</span>
            <span>{CATEGORY_LABELS[campaign.category]}</span>
          </div>

          {/* Status badge */}
          {isCompleted && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(16,185,129,0.92)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px', fontSize: '0.6875rem',
              fontWeight: 700, color: '#fff', letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
            }}>✓ Đạt mục tiêu</div>
          )}
          {isUrgent && !isCompleted && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(186,26,26,0.9)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px', fontSize: '0.6875rem',
              fontWeight: 700, color: '#fff', letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
            }}>⚡ Gấp</div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {/* Creator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={campaign.creator.avatar || `https://ui-avatars.com/api/?name=${campaign.creator.name}&background=2563eb&color=fff&size=48`}
              alt={campaign.creator.name}
              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--outline-variant)' }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--outline)', fontWeight: 500 }}>
              {campaign.creator.name}
            </span>
            {campaign.creator.isVerified && (
              <span style={{
                fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: '#047857', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                padding: '1px 7px', borderRadius: 'var(--radius-full)',
              }}>✓ Xác minh</span>
            )}
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: featured ? '1.0625rem' : '0.9375rem',
            fontWeight: 600,
            color: 'var(--on-surface)',
            lineHeight: 1.4,
            letterSpacing: '-0.015em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
            margin: 0,
          }}>
            {campaign.title}
          </h3>

          {/* Short desc */}
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--on-surface-variant)',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
            margin: 0,
            flex: 1,
          }}>
            {campaign.shortDesc}
          </p>

          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--outline)', fontWeight: 500 }}>
                Tiến độ
              </span>
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                color: isCompleted ? '#047857' : 'var(--primary-container)',
              }}>
                {progress}%
              </span>
            </div>
            <div style={{
              width: '100%', height: 6,
              background: 'var(--surface-container-high)',
              borderRadius: 'var(--radius-full)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, progress)}%`,
                borderRadius: 'var(--radius-full)',
                background: isCompleted
                  ? 'linear-gradient(90deg, var(--secondary), #10b981)'
                  : 'linear-gradient(90deg, var(--primary), var(--primary-container))',
                animation: 'progress-fill 1.2s ease-out',
              }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            paddingTop: 10, borderTop: '1px solid var(--outline-variant)',
          }}>
            <div>
              <div style={{
                fontSize: '1.0625rem', fontWeight: 700,
                color: 'var(--primary)', letterSpacing: '-0.02em',
                fontFeatureSettings: '"tnum" 1',
              }}>
                {formatCurrency(campaign.raisedAmount)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: 1 }}>
                / {formatCurrency(campaign.targetAmount)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                {campaign.donorCount.toLocaleString('vi-VN')} người
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: daysLeft <= 7 ? 'var(--error)' : daysLeft <= 30 ? '#d97706' : 'var(--outline)',
                fontWeight: daysLeft <= 7 ? 600 : 400,
                marginTop: 1,
              }}>
                {daysLeft === 0 ? 'Đã kết thúc' : `Còn ${daysLeft} ngày`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CampaignCard;
