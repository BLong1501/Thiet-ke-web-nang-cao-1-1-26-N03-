import React from 'react';
import { Link } from 'react-router-dom';
import type { Campaign } from '../../types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../types';
import { formatCurrency, getDaysLeft, getProgress } from '../../services/api';
import ProgressBar from './ProgressBar';

interface CampaignCardProps {
  campaign: Campaign;
  featured?: boolean;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, featured = false }) => {
  const [hovered, setHovered] = React.useState(false);
  const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);
  const daysLeft = getDaysLeft(campaign.deadline);
  const isUrgent = daysLeft <= 7;

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered
            ? 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)'
            : 'rgba(22, 33, 62, 0.8)',
          border: `1px solid ${hovered ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: hovered
            ? '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(124,58,237,0.2)'
            : '0 4px 20px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          height: featured ? 'auto' : '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', overflow: 'hidden', height: featured ? 220 : 180 }}>
          <img
            src={campaign.thumbnail}
            alt={campaign.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
            }}
          />
          {/* Overlay gradient */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(10,10,20,0.8) 0%, transparent 60%)',
          }} />

          {/* Category badge */}
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(10,10,20,0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span>{CATEGORY_ICONS[campaign.category]}</span>
            <span>{CATEGORY_LABELS[campaign.category]}</span>
          </div>

          {/* Urgent badge */}
          {isUrgent && daysLeft > 0 && (
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(239,68,68,0.9)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#fff',
              animation: 'pulse-glow 2s infinite',
            }}>
              🔥 Gấp
            </div>
          )}

          {/* Progress % overlay */}
          {progress >= 100 && (
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(16,185,129,0.9)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#fff',
            }}>
              ✅ Đạt mục tiêu
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {/* Creator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={campaign.creator.avatar || `https://ui-avatars.com/api/?name=${campaign.creator.name}&background=7c3aed&color=fff`}
              alt={campaign.creator.name}
              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {campaign.creator.name}
            </span>
            {campaign.creator.isVerified && (
              <span title="Đã xác minh" style={{ fontSize: '0.75rem' }}>✅</span>
            )}
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: featured ? '1.1rem' : '0.95rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
          }}>
            {campaign.title}
          </h3>

          {/* Short desc */}
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
            flex: 1,
          }}>
            {campaign.shortDesc}
          </p>

          {/* Progress */}
          <ProgressBar value={progress} height={6} />

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {formatCurrency(campaign.raisedAmount)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                / {formatCurrency(campaign.targetAmount)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: progress >= 100 ? 'var(--emerald-400)' : 'var(--primary-400)',
              }}>
                {progress}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {campaign.donorCount.toLocaleString('vi-VN')} người ủng hộ
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{
              fontSize: '0.78rem',
              color: daysLeft <= 7 ? 'var(--red-400)' : daysLeft <= 30 ? 'var(--amber-400)' : 'var(--text-muted)',
              fontWeight: daysLeft <= 7 ? 700 : 400,
            }}>
              {daysLeft === 0 ? '⏰ Đã kết thúc' : `⏳ Còn ${daysLeft} ngày`}
            </span>
            <span style={{
              fontSize: '0.78rem',
              color: 'var(--primary-400)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              Xem chi tiết →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CampaignCard;
