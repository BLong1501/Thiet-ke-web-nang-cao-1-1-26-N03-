import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { setUser, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Đăng nhập - FundVN';
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1500));

    if (email === 'demo@fundvn.com' || email.includes('@')) {
      setUser({
        id: '1', name: 'Nguyễn Văn An', email,
        avatar: 'https://i.pravatar.cc/150?img=1',
        role: email.includes('admin') ? 'admin' : 'fundraiser',
        isVerified: true, joinedAt: '2024-01-15',
        totalRaised: 150000000,
      }, 'demo-token-123');
      navigate('/dashboard');
    } else {
      setError('Email hoặc mật khẩu không chính xác. Thử demo@fundvn.com');
    }
    setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a14, #1a0a2e)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px',
    }}>
      {/* Background orbs */}
      {[
        { w: 400, h: 400, top: '-5%', left: '-10%', color: 'rgba(124,58,237,0.12)' },
        { w: 300, h: 300, bottom: '5%', right: '-5%', color: 'rgba(79,70,229,0.1)' },
      ].map((orb, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: orb.w, height: orb.h,
          top: orb.top, left: (orb as any).left, right: (orb as any).right, bottom: (orb as any).bottom,
          background: orb.color, borderRadius: '50%', filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, maxWidth: 920, width: '100%', borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}>
        {/* Left: Branding */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4)',
          padding: '48px 40px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />
          <div style={{ position: 'relative' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>💚</div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem', color: '#fff' }}>FundVN</span>
            </Link>
            <h2 style={{ fontFamily: 'var(--font-heading)', color: '#fff', marginBottom: 16, fontSize: '1.8rem', lineHeight: 1.3 }}>
              Chào mừng trở lại! 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
              Đăng nhập để quản lý chiến dịch, theo dõi quyên góp và kết nối với cộng đồng.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            {[
              { icon: '🔒', text: 'Bảo mật tuyệt đối với SSL' },
              { icon: '💳', text: 'Đa dạng phương thức thanh toán' },
              { icon: '📊', text: 'Minh bạch 100% tài chính' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{icon}</div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div style={{
          background: 'rgba(15,15,26,0.98)',
          backdropFilter: 'blur(20px)',
          padding: '48px 40px',
        }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8, fontSize: '1.5rem' }}>Đăng nhập</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.875rem' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}>
              Đăng ký ngay
            </Link>
          </p>

          {/* Social login */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {[{ icon: '🇬', label: 'Google' }, { icon: '📘', label: 'Facebook' }].map(({ icon, label }) => (
              <button key={label} style={{
                flex: 1, padding: '11px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {icon} {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-disabled)' }}>hoặc</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                padding: '12px 16px', marginBottom: 18,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#f87171', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="email@example.com"
                required
                style={{
                  width: '100%', padding: '12px 16px',
                  background: focusedField === 'email' ? 'rgba(124,58,237,0.08)' : 'rgba(18,18,42,0.8)',
                  border: `1.5px solid ${focusedField === 'email' ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                  fontFamily: 'var(--font-body)', boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span>Mật khẩu</span>
                <a href="#" style={{ color: 'var(--primary-400)', fontWeight: 400, textDecoration: 'none' }}>Quên mật khẩu?</a>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '12px 48px 12px 16px',
                    background: focusedField === 'password' ? 'rgba(124,58,237,0.08)' : 'rgba(18,18,42,0.8)',
                    border: `1.5px solid ${focusedField === 'password' ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                    fontFamily: 'var(--font-body)', boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '1rem',
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '14px',
                background: isLoading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '1rem', fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                boxShadow: isLoading ? 'none' : '0 6px 24px rgba(124,58,237,0.4)',
                transition: 'all 0.3s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {isLoading ? (
                <>
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Đang đăng nhập...
                </>
              ) : '🚀 Đăng nhập'}
            </button>
          </form>

          {/* Demo hint */}
          <div style={{
            marginTop: 20, padding: '12px', textAlign: 'center',
            background: 'rgba(6,182,212,0.08)',
            border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.78rem', color: 'var(--cyan-400)',
          }}>
            💡 Demo: nhập bất kỳ email hợp lệ + mật khẩu bất kỳ
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-left { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
