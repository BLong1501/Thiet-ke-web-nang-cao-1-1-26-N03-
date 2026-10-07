import React from 'react';
import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  'Khám phá': [
    { label: 'Tất cả chiến dịch', to: '/campaigns' },
    { label: 'Y tế & Sức khỏe', to: '/campaigns?category=y-te' },
    { label: 'Giáo dục', to: '/campaigns?category=giao-duc' },
    { label: 'Môi trường', to: '/campaigns?category=moi-truong' },
    { label: 'Cứu trợ khẩn cấp', to: '/campaigns?category=cuu-tro' },
  ],
  'Về FundTrust': [
    { label: 'Câu chuyện của chúng tôi', to: '/about' },
    { label: 'Quy trình xác minh A-to-Z', to: '/verification' },
    { label: 'Báo cáo minh bạch', to: '/transparency' },
    { label: 'Đối tác kiểm toán', to: '/partners' },
    { label: 'Báo cáo tác động hàng năm', to: '/impact' },
  ],
  'Minh bạch & Bảo mật': [
    { label: 'Sổ cái tài chính công khai', to: '/ledger' },
    { label: 'Chính sách bảo vệ người dùng', to: '/privacy' },
    { label: 'Cơ chế hoàn tiền', to: '/refund' },
    { label: 'Điều khoản sử dụng', to: '/terms' },
    { label: 'Hỏi đáp thường gặp', to: '/faq' },
  ],
};

export const Footer: React.FC = () => {
  return (
    <footer style={{
      background: 'var(--surface-container-lowest)',
      borderTop: '1px solid var(--outline-variant)',
    }}>
      {/* Newsletter CTA */}
      <div style={{
        borderBottom: '1px solid var(--outline-variant)',
        padding: '40px 0',
        background: 'var(--surface-container-low)',
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ marginBottom: 6, color: 'var(--on-surface)', letterSpacing: '-0.015em' }}>
                📩 Nhận thông tin chiến dịch mới nhất
              </h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                Cập nhật ngay các chiến dịch cần sự hỗ trợ khẩn cấp.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="Email của bạn..."
                style={{
                  height: 44, padding: '0 16px',
                  background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--outline-variant)', borderRadius: 10,
                  color: 'var(--on-surface)', fontSize: '0.9rem',
                  fontFamily: 'var(--font-body)', outline: 'none',
                  minWidth: 240,
                  transition: 'border-color 0.18s ease',
                }}
                onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--primary-container)'}
                onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--outline-variant)'}
              />
              <button style={{
                height: 44, padding: '0 20px',
                background: 'var(--primary-container)',
                border: 'none', borderRadius: 10,
                color: '#fff', fontFamily: 'var(--font-body)',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                transition: 'all 0.18s ease',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-container)'}
              >
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div style={{ padding: '56px 0 40px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '280px repeat(3, 1fr)', gap: 48 }}>
            {/* Brand */}
            <div>
              <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32,
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '1rem', filter: 'brightness(0) invert(1)' }}>⟡</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.025em', color: 'var(--on-surface)' }}>
                  Fund<span style={{ color: 'var(--primary-container)' }}>Trust</span>
                </span>
              </Link>
              <p style={{
                fontSize: '0.875rem', color: 'var(--on-surface-variant)',
                lineHeight: 1.65, marginBottom: 20,
              }}>
                Gây quỹ minh bạch. Trao niềm tin đúng nơi. Nền tảng xác minh 100% A-to-Z đầu tiên tại Việt Nam.
              </p>
              {/* Trust badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  '✓ Xác minh bởi Bộ Thông tin & Truyền thông',
                  '🏦 Tài khoản tín thác MB Bank',
                  '🔒 Mã hóa SSL 256-bit',
                ].map((badge, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>{badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <h6 style={{
                  marginBottom: 16,
                  color: 'var(--on-surface)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}>
                  {title}
                </h6>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {links.map(link => (
                    <li key={link.to}>
                      <Link to={link.to} style={{
                        fontSize: '0.875rem',
                        color: 'var(--on-surface-variant)',
                        textDecoration: 'none',
                        transition: 'color 0.15s ease',
                        fontWeight: 400,
                      }}
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary-container)'}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--on-surface-variant)'}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid var(--outline-variant)', padding: '20px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--outline)' }}>
              © 2026 FundTrust Technologies Inc. Bảo lưu mọi quyền lợi.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {['Điều khoản', 'Bảo mật', 'Cookie'].map((item, i) => (
                <a key={i} href="#" style={{
                  fontSize: '0.8125rem', color: 'var(--outline)',
                  textDecoration: 'none', transition: 'color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary-container)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--outline)'}
                >
                  {item}
                </a>
              ))}
              {/* Social icons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {['FB', 'TW', 'IG'].map((s, i) => (
                  <a key={i} href="#" style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--surface-container)',
                    border: '1px solid var(--outline-variant)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700,
                    color: 'var(--on-surface-variant)', textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary-fixed)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary-container)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-container)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--on-surface-variant)'; }}
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
