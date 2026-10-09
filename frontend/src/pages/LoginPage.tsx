import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Đăng nhập - FundTrust';
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    if (email.includes('@')) {
      const role = email.includes('admin') ? 'admin' : email.includes('user') ? 'user' : 'fundraiser';
      setUser(
        {
          id: '1',
          name: email.includes('admin') ? 'Quản trị viên Hệ thống' : email.includes('user') ? 'Trần Thị Bình' : 'Nguyễn Văn An',
          email,
          avatar: 'https://i.pravatar.cc/150?img=1',
          role: role as any,
          isVerified: true,
          joinedAt: '2024-01-15',
          totalRaised: 150000000,
          totalDonated: 5000000,
        },
        'token-demo-xyz-123'
      );
      navigate('/dashboard');
    } else {
      setError('Vui lòng nhập định dạng email hợp lệ (hoặc chọn tài khoản demo)');
    }
    setIsLoading(false);
  };

  const handleQuickLogin = (role: 'fundraiser' | 'admin' | 'user') => {
    const emailMap = {
      fundraiser: 'fundraiser@fundtrust.vn',
      admin: 'admin@fundtrust.vn',
      user: 'donor@fundtrust.vn',
    };
    setEmail(emailMap[role]);
    setPassword('demo123456');
    setUser(
      {
        id: '1',
        name: role === 'admin' ? 'Quản trị viên Hệ thống' : role === 'fundraiser' ? 'Nguyễn Văn An' : 'Trần Thị Bình',
        email: emailMap[role],
        avatar: role === 'user' ? 'https://i.pravatar.cc/150?img=5' : 'https://i.pravatar.cc/150?img=1',
        role,
        isVerified: true,
        joinedAt: '2024-01-15',
        totalRaised: role === 'fundraiser' ? 150000000 : 0,
        totalDonated: role === 'user' ? 8000000 : 2000000,
      },
      'token-demo-xyz-123'
    );
    navigate('/dashboard');
  };

  return (
    <div
      className="page-enter"
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          maxWidth: 920,
          width: '100%',
          background: 'var(--surface-container-lowest)',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Left Side: Brand Visual */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
            padding: '48px 40px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
              <div style={{ width: 36, height: 36, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '1.2rem' }}>
                ⟡
              </div>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                FundTrust
              </span>
            </Link>

            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.3, marginBottom: 16 }}>
              Chào mừng trở lại với nền tảng gây quỹ minh bạch
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>
              Đăng nhập để theo dõi dòng tiền ủng hộ, cập nhật tiến độ chiến dịch và kiểm toán sao kê thời gian thực.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40 }}>
              {[
                { icon: '🛡️', text: '100% người gây quỹ xác minh danh tính KYC' },
                { icon: '🏦', text: 'Tài khoản ký quỹ bảo lãnh đối soát ngân hàng' },
                { icon: '🧾', text: 'Sao kê tự động đính kèm hóa đơn đỏ' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <span style={{ opacity: 0.95 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Đăng nhập tài khoản
          </h3>
          <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Đăng ký thành viên
            </Link>
          </p>

          {/* Quick Demo Logins */}
          <div style={{ marginBottom: 24, padding: '14px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 8 }}>
              ⚡ Đăng nhập nhanh 1 chạm (Tài khoản mẫu):
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('fundraiser')}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-lowest)',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🎯 Fundraiser
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-lowest)',
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🛡️ Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('user')}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-lowest)',
                  color: '#059669',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ❤️ Nhà hảo tâm
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.8125rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                Email đăng nhập
              </label>
              <input
                type="email"
                placeholder="example@fundtrust.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--outline-variant)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                  Mật khẩu
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Vui lòng sử dụng tính năng Đăng nhập nhanh 1 chạm!'); }} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}>
                  Quên mật khẩu?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 40px 11px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: 'var(--outline)',
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
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--primary-container)',
                color: '#fff',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
                transition: 'all 0.18s ease',
              }}
            >
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
