import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const NAV_LINKS = [
  { to: '/', label: 'Khám phá' },
  { to: '/campaigns', label: 'Chiến dịch' },
  { to: '/how-it-works', label: 'Cách hoạt động' },
  { to: '/dashboard', label: 'Minh bạch tài chính' },
  { to: '/admin/activity-logs', label: 'Nhật ký hệ thống' },
];

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/'); setProfileOpen(false); };

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 'var(--z-sticky)' as unknown as number,
        height: 64,
        background: scrolled
          ? 'rgba(255,255,255,0.92)'
          : 'rgba(255,255,255,0.98)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--outline-variant)' : 'var(--outline-variant)'}`,
        transition: 'all 0.25s ease',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      }}>
        <div style={{
          maxWidth: 'var(--container-max)',
          margin: '0 auto',
          padding: '0 var(--gutter)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginRight: 24, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}>
              <span style={{ fontSize: '1rem', filter: 'brightness(0) invert(1)' }}>⟡</span>
            </div>
            <span style={{
              fontWeight: 800,
              fontSize: '1.125rem',
              letterSpacing: '-0.025em',
              color: 'var(--on-surface)',
              fontFamily: 'var(--font-heading)',
            }}>
              Fund<span style={{ color: 'var(--primary-container)' }}>Trust</span>
            </span>
          </Link>

          {/* Nav links - desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: isActive(link.to) ? 600 : 500,
                  color: isActive(link.to) ? 'var(--primary-container)' : 'var(--on-surface-variant)',
                  background: isActive(link.to) ? 'var(--primary-fixed)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive(link.to)) {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-container-low)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--on-surface)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive(link.to)) {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--on-surface-variant)';
                  }
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {!isAuthenticated ? (
              <>
                <button
                  onClick={handleDemoLogin}
                  style={{
                    padding: '7px 16px',
                    background: 'transparent',
                    border: '1.5px solid var(--outline-variant)',
                    borderRadius: 10,
                    color: 'var(--on-surface)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--outline)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--outline-variant)';
                  }}
                >
                  Đăng nhập
                </button>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <button style={{
                    padding: '8px 18px',
                    background: 'var(--primary-container)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'var(--on-primary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(37,99,235,0.25)',
                    transition: 'all 0.18s ease',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-container)';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    }}
                  >
                    Tạo chiến dịch
                  </button>
                </Link>
              </>
            ) : (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 12px 5px 5px',
                    background: profileOpen ? 'var(--surface-container)' : 'var(--surface-container-low)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=2563eb&color=fff`}
                    alt={user?.name}
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--on-surface)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--outline)' }}>
                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {profileOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '6px',
                    minWidth: 200,
                    zIndex: 'var(--z-dropdown)' as unknown as number,
                    animation: 'scaleIn 0.15s ease',
                  }}>
                    {[
                      { to: '/dashboard', label: '📊 Dashboard', icon: '' },
                      { to: '/profile', label: '👤 Hồ sơ cá nhân', icon: '' },
                      { to: '/campaigns/create', label: '🚀 Tạo chiến dịch', icon: '' },
                      { to: '/admin/activity-logs', label: '📜 Nhật ký hệ thống', icon: '' },
                    ].map(item => (
                      <Link key={item.to} to={item.to} style={{
                        display: 'block', padding: '9px 12px',
                        borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
                        color: 'var(--on-surface)', textDecoration: 'none',
                        transition: 'background 0.15s',
                        fontWeight: 500,
                      }}
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-container-low)'}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
                        onClick={() => setProfileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ height: 1, background: 'var(--outline-variant)', margin: '4px 0' }} />
                    <button onClick={handleLogout} style={{
                      width: '100%', padding: '9px 12px', textAlign: 'left',
                      background: 'transparent', border: 'none', borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem', color: 'var(--error)', cursor: 'pointer',
                      fontWeight: 500, fontFamily: 'var(--font-body)',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--error-container)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 'var(--z-overlay)' as unknown as number,
          background: 'rgba(19,27,46,0.4)',
        }} onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
};

export default Navbar;
