import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  height?: number;
  showLabel?: boolean;
  animate?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  height = 8,
  showLabel = false,
  animate = true,
  color = 'primary',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  const gradients: Record<string, string> = {
    primary: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)',
    success: 'linear-gradient(90deg, #059669, #10b981)',
    warning: 'linear-gradient(90deg, #d97706, #f59e0b)',
    danger: 'linear-gradient(90deg, #dc2626, #ef4444)',
  };

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
          fontSize: '0.8rem',
          color: 'var(--on-surface-variant)',
        }}>
          <span>Tiến độ</span>
          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{clampedValue}%</span>
        </div>
      )}
      <div style={{
        width: '100%',
        height,
        background: 'var(--surface-container-high)',
        borderRadius: 9999,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div
          style={{
            height: '100%',
            width: `${clampedValue}%`,
            background: gradients[color],
            borderRadius: 9999,
            transition: animate ? 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            position: 'relative',
          }}
        >
          {/* Shimmer effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }} />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
