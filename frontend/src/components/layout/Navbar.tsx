import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/campaigns', label: 'Chiến dịch' },
  { to: '/community', label: 'Cộng đồng' },
];

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
  };

  // Mock: login as demo user
  const handleDemoLogin = () => {
    useAuthStore.getState().setUser(
      {
        id: '1', name: 'Nguyễn Văn An', email: 'an@example.com',
        avatar: 'https://i.pravatar.cc/150?img=1',
        role: 'fundraiser', isVerified: true,
        joinedAt: '2024-01-15', totalRaised: 150000000,
      },
      'demo-token-123'
    );
    navigate('/dashboard');
  };

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 'var(--z-sticky)' as unknown as number,
        height: 72,
        background: scrolled
          ? 'rgba(10, 10, 20, 0.92)'
          : 'rgba(10, 10, 20, 0.5)',
        backdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.4)' : 'none',
      }}>
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginRight: 16 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
            }}>
              💚
            </div>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.3rem',
              background: 'linear-gradient(135deg, #a78bfa, #6366f1, #22d3ee)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              FundVN
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', gap: 4, flex: 1 }} className="nav-desktop">
            {NAV_LINKS.map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link key={to} to={to} style={{
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.9rem',
                  background: isActive ? 'rgba(124,58,237,0.2)' : 'transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}>
                  {label}
                  {isActive && (
                    <div style={{
                      position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                      width: 16, height: 2,
                      background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                      borderRadius: 2,
                    }} />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {isAuthenticated ? (
              <>
                {/* Create Campaign */}
                <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                  }}>
                    + Tạo chiến dịch
                  </button>
                </Link>

                {/* Notification bell */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      padding: '8px',
                      fontSize: '1.1rem',
                      position: 'relative',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    🔔
                    <div style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 8, height: 8,
                      background: '#ef4444',
                      borderRadius: '50%',
                      border: '1.5px solid var(--bg-base)',
                    }} />
                  </button>
                  {notifOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 8,
                      width: 320,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-xl)',
                      zIndex: 200,
                      overflow: 'hidden',
                    }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontFamily: 'var(--font-heading)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Thông báo</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-400)', cursor: 'pointer' }}>Đánh dấu đã đọc</span>
                      </div>
                      {[
                        { icon: '💰', title: 'Quyên góp mới', msg: 'Chiến dịch của bạn nhận được 500,000đ', time: '5 phút trước' },
                        { icon: '✅', title: 'Xác minh thành công', msg: 'Tài khoản của bạn đã được xác minh', time: '1 giờ trước' },
                        { icon: '📣', title: 'Campaign được duyệt', msg: '"Trường học Hà Giang" đã được duyệt', time: '2 giờ trước' },
                      ].map((n, i) => (
                        <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 12, cursor: 'pointer', transition: 'background 0.2s' }}>
                          <span style={{ fontSize: '1.3rem' }}>{n.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{n.msg}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-disabled)', marginTop: 3 }}>{n.time}</div>
                          </div>
                          <div style={{ width: 8, height: 8, background: 'var(--primary-500)', borderRadius: '50%', marginTop: 4, flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User avatar */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8, padding: '4px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <img
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=7c3aed&color=fff`}
                      alt={user?.name}
                      style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(124,58,237,0.5)' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
                  </button>
                  {profileOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 8,
                      width: 220,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-xl)',
                      zIndex: 200,
                      overflow: 'hidden',
                    }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                      </div>
                      {[
                        { to: '/dashboard', icon: '📊', label: 'Dashboard' },
                        { to: '/profile', icon: '👤', label: 'Hồ sơ' },
                        ...(user?.role === 'admin' ? [{ to: '/admin', icon: '🛡️', label: 'Quản trị' }] : []),
                      ].map((item) => (
                        <Link key={item.to} to={item.to} onClick={() => setProfileOpen(false)} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px', textDecoration: 'none',
                          color: 'var(--text-secondary)', fontSize: '0.875rem',
                          transition: 'background 0.2s',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}>
                          <span>{item.icon}</span> {item.label}
                        </Link>
                      ))}
                      <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 16px', background: 'none', border: 'none',
                        color: '#f87171', fontSize: '0.875rem', cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                      }}>
                        <span>🚪</span> Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '8px 18px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}>
                    Đăng nhập
                  </button>
                </Link>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '8px 18px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                    whiteSpace: 'nowrap',
                  }}>
                    Đăng ký
                  </button>
                </Link>
                <button onClick={handleDemoLogin} style={{
                  background: 'transparent',
                  border: '1px solid rgba(6,182,212,0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--cyan-400)',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                }}>
                  Demo
                </button>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px 10px',
                fontSize: '1.1rem',
              }}
              className="mobile-toggle"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed',
          top: 72, left: 0, right: 0,
          background: 'rgba(10,10,20,0.98)',
          backdropFilter: 'blur(20px)',
          zIndex: 199,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              textDecoration: 'none',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              color: location.pathname === to ? 'var(--primary-400)' : 'var(--text-secondary)',
              fontWeight: location.pathname === to ? 600 : 400,
              fontSize: '1rem',
              background: location.pathname === to ? 'rgba(124,58,237,0.15)' : 'transparent',
              display: 'block',
            }}>
              {label}
            </Link>
          ))}
          {!isAuthenticated && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <Link to="/login" style={{ flex: 1, textDecoration: 'none' }}>
                <button style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font-body)' }}>
                  Đăng nhập
                </button>
              </Link>
              <Link to="/register" style={{ flex: 1, textDecoration: 'none' }}>
                <button style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  Đăng ký
                </button>
              </Link>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .mobile-toggle { display: flex !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
