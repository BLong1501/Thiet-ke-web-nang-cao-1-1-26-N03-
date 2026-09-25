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
    primary: 'linear-gradient(90deg, #7c3aed, #4f46e5, #06b6d4)',
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
          color: 'var(--text-muted)',
        }}>
          <span>Tiến độ</span>
          <span style={{ color: 'var(--primary-400)', fontWeight: 700 }}>{clampedValue}%</span>
        </div>
      )}
      <div style={{
        width: '100%',
        height,
        background: 'rgba(255,255,255,0.07)',
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
            boxShadow: `0 0 10px rgba(124, 58, 237, 0.5)`,
          }}
        >
          {/* Shimmer effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }} />
          {/* Dot at end */}
          {clampedValue > 5 && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: height + 4,
              height: height + 4,
              background: '#ffffff',
              borderRadius: '50%',
              boxShadow: '0 0 8px rgba(124, 58, 237, 0.8)',
            }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
