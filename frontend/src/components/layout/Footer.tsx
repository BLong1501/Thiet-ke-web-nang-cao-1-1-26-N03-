import React from 'react';
import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  'Về FundVN': [
    { label: 'Giới thiệu', to: '#' },
    { label: 'Đội ngũ', to: '#' },
    { label: 'Điều khoản', to: '#' },
    { label: 'Chính sách bảo mật', to: '#' },
  ],
  'Cho người quyên góp': [
    { label: 'Cách quyên góp', to: '#' },
    { label: 'Bảo đảm an toàn', to: '#' },
    { label: 'Câu hỏi thường gặp', to: '#' },
  ],
  'Cho người gây quỹ': [
    { label: 'Bắt đầu chiến dịch', to: '/campaigns/create' },
    { label: 'Xác minh tài khoản', to: '#' },
    { label: 'Hướng dẫn gây quỹ', to: '#' },
  ],
};

export const Footer: React.FC = () => {
  return (
    <footer style={{
      background: 'linear-gradient(180deg, var(--bg-base) 0%, #0a0a18 100%)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 64,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem',
              }}>💚</div>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800, fontSize: '1.5rem',
                background: 'linear-gradient(135deg, #a78bfa, #6366f1, #22d3ee)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>FundVN</span>
            </Link>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 280 }}>
              Nền tảng gây quỹ cộng đồng hàng đầu Việt Nam. Kết nối những tấm lòng vàng với các chiến dịch ý nghĩa.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {['Facebook', 'Twitter', 'Instagram', 'YouTube'].map((social) => (
                <a key={social} href="#" style={{
                  width: 36, height: 36,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textDecoration: 'none', color: 'var(--text-muted)',
                  fontSize: '0.75rem', fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}>
                  {social[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.85rem', fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {category}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} style={{
                      textDecoration: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.875rem',
                      transition: 'color 0.2s ease',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-400)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.05))',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          marginBottom: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 6, fontSize: '1.1rem' }}>
              📩 Nhận thông tin chiến dịch mới nhất
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Cập nhật ngay các chiến dịch cần sự hỗ trợ khẩn cấp.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="Email của bạn..."
              style={{
                padding: '10px 16px', background: 'rgba(18,18,42,0.8)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                fontFamily: 'var(--font-body)', minWidth: 220,
              }}
            />
            <button style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              fontFamily: 'var(--font-body)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
            }}>
              Đăng ký
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            © 2026 FundVN. Được xây dựng với ❤️ tại Việt Nam. Nhóm N03 - CĐ09.
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            {['Điều khoản', 'Bảo mật', 'Cookie'].map((item) => (
              <a key={item} href="#" style={{
                fontSize: '0.82rem', color: 'var(--text-muted)',
                textDecoration: 'none', transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          footer > div > div:first-child {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          footer > div > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
