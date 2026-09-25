import React, { useEffect, useRef, useState } from 'react';

interface StatsCounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  label: string;
  icon?: string;
}

export const StatsCounter: React.FC<StatsCounterProps> = ({
  end,
  prefix = '',
  suffix = '',
  duration = 2000,
  label,
  icon,
}) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Easing: easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'T';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'M';
    if (n >= 1_000) return n.toLocaleString('vi-VN');
    return n.toString();
  };

  return (
    <div
      ref={ref}
      style={{
        textAlign: 'center',
        padding: '28px 20px',
        background: 'rgba(26,26,46,0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-xl)',
        transition: 'all 0.3s ease',
      }}
    >
      {icon && (
        <div style={{
          fontSize: '2.2rem',
          marginBottom: 12,
          filter: 'drop-shadow(0 0 10px rgba(124,58,237,0.5))',
        }}>
          {icon}
        </div>
      )}
      <div style={{
        fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
        fontWeight: 900,
        fontFamily: 'var(--font-heading)',
        background: 'linear-gradient(135deg, #a78bfa, #6366f1, #22d3ee)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
        marginBottom: 8,
      }}>
        {prefix}{formatNumber(count)}{suffix}
      </div>
      <div style={{
        fontSize: '0.9rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
      }}>
        {label}
      </div>
    </div>
  );
};

export default StatsCounter;
