import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CampaignCard } from '../components/ui/CampaignCard';
import { StatsCounter } from '../components/ui/StatsCounter';
import { SearchBar } from '../components/ui/SearchBar';
import { mockCampaigns, mockStats } from '../data/mockData';
import { CATEGORY_LABELS, CATEGORY_ICONS, type CampaignCategory } from '../types';

// Hero floating orbs component
const FloatingOrbs: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {[
      { w: 500, h: 500, top: '-10%', left: '-10%', color: 'rgba(124,58,237,0.12)', delay: '0s' },
      { w: 400, h: 400, top: '30%', right: '-5%', color: 'rgba(79,70,229,0.1)', delay: '2s' },
      { w: 300, h: 300, bottom: '10%', left: '30%', color: 'rgba(6,182,212,0.08)', delay: '4s' },
    ].map((orb, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: orb.w, height: orb.h,
          top: orb.top, left: (orb as any).left, right: (orb as any).right, bottom: (orb as any).bottom,
          background: orb.color,
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: `orb ${8 + i * 2}s ease-in-out infinite`,
          animationDelay: orb.delay,
        }}
      />
    ))}
  </div>
);

// How it works steps
const HOW_IT_WORKS = [
  {
    step: '01', icon: '✍️',
    title: 'Tạo chiến dịch',
    desc: 'Đăng ký, xác minh danh tính và tạo chiến dịch với mục tiêu rõ ràng. Dễ dàng trong 5 phút.',
  },
  {
    step: '02', icon: '📣',
    title: 'Lan tỏa câu chuyện',
    desc: 'Chia sẻ chiến dịch lên mạng xã hội. Cộng đồng FundVN sẽ giúp bạn tiếp cận hàng nghìn người.',
  },
  {
    step: '03', icon: '💰',
    title: 'Nhận đóng góp',
    desc: 'Mọi người quyên góp an toàn qua nhiều hình thức thanh toán. Tiền được giữ an toàn đến khi đạt mục tiêu.',
  },
  {
    step: '04', icon: '🎯',
    title: 'Tạo sức ảnh hưởng',
    desc: 'Báo cáo minh bạch quá trình sử dụng tiền. Xây dựng niềm tin và cộng đồng bền vững.',
  },
];

// Testimonials
const TESTIMONIALS = [
  {
    avatar: 'https://i.pravatar.cc/80?img=1',
    name: 'Nguyễn Thị Lan',
    role: 'Fundraiser',
    text: 'FundVN giúp tôi gây quỹ được 300 triệu đồng chỉ trong 2 tháng. Quy trình đơn giản, hỗ trợ tuyệt vời!',
    stars: 5,
  },
  {
    avatar: 'https://i.pravatar.cc/80?img=4',
    name: 'Trần Văn Hùng',
    role: 'Donor',
    text: 'Tôi tin tưởng quyên góp vì mọi giao dịch đều minh bạch và có báo cáo chi tiết. Rất uy tín!',
    stars: 5,
  },
  {
    avatar: 'https://i.pravatar.cc/80?img=9',
    name: 'Lê Thị Hoa',
    role: 'Fundraiser',
    text: 'Nền tảng hiện đại, dễ sử dụng. Cộng đồng nhiệt tình ủng hộ chiến dịch của tôi. Cảm ơn FundVN!',
    stars: 5,
  },
];

// Category quick links
const CATEGORIES: Array<{ key: CampaignCategory; label: string; icon: string; color: string }> = [
  { key: 'y-te', label: CATEGORY_LABELS['y-te'], icon: CATEGORY_ICONS['y-te'], color: '#ef4444' },
  { key: 'giao-duc', label: CATEGORY_LABELS['giao-duc'], icon: CATEGORY_ICONS['giao-duc'], color: '#f59e0b' },
  { key: 'moi-truong', label: CATEGORY_LABELS['moi-truong'], icon: CATEGORY_ICONS['moi-truong'], color: '#10b981' },
  { key: 'cuu-tro', label: CATEGORY_LABELS['cuu-tro'], icon: CATEGORY_ICONS['cuu-tro'], color: '#3b82f6' },
  { key: 'dong-vat', label: CATEGORY_LABELS['dong-vat'], icon: CATEGORY_ICONS['dong-vat'], color: '#8b5cf6' },
  { key: 'cong-dong', label: CATEGORY_LABELS['cong-dong'], icon: CATEGORY_ICONS['cong-dong'], color: '#06b6d4' },
  { key: 'sang-tao', label: CATEGORY_LABELS['sang-tao'], icon: CATEGORY_ICONS['sang-tao'], color: '#ec4899' },
  { key: 'khac', label: CATEGORY_LABELS['khac'], icon: CATEGORY_ICONS['khac'], color: '#6b7280' },
];

const HomePage: React.FC = () => {
  const [visibleSection, setVisibleSection] = useState<string>('');

  useEffect(() => {
    document.title = 'FundVN - Nền tảng Gây quỹ Cộng đồng Hàng đầu Việt Nam';
  }, []);

  const featuredCampaigns = mockCampaigns.slice(0, 3);
  const urgentCampaigns = mockCampaigns.slice(3, 6);

  return (
    <div className="page-enter">
      {/* ===== HERO SECTION ===== */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0a0a14 0%, #0f0f1a 40%, #1a0a2e 100%)',
        overflow: 'hidden',
      }}>
        <FloatingOrbs />

        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 120, paddingBottom: 80 }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 16px',
              marginBottom: 28,
              animation: 'fadeIn 0.6s ease forwards',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse-glow 2s infinite',
              }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-400)' }}>
                🇻🇳 Nền tảng gây quỹ #1 Việt Nam
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              marginBottom: 20,
              lineHeight: 1.1,
              animation: 'slideUp 0.7s ease forwards',
            }}>
              Cùng nhau{' '}
              <span style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 40%, #22d3ee 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                thay đổi
              </span>
              {' '}cuộc sống
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              marginBottom: 40,
              animation: 'slideUp 0.7s ease 0.1s both forwards',
              maxWidth: 560,
              margin: '0 auto 40px',
            }}>
              FundVN kết nối những tấm lòng thiện nguyện với các chiến dịch gây quỹ ý nghĩa.
              Minh bạch, an toàn, tạo sức ảnh hưởng thực sự.
            </p>

            {/* Search */}
            <div style={{
              maxWidth: 580,
              margin: '0 auto 40px',
              animation: 'slideUp 0.7s ease 0.2s both forwards',
            }}>
              <SearchBar large placeholder="Tìm chiến dịch bạn muốn ủng hộ..." />
            </div>

            {/* CTA Buttons */}
            <div style={{
              display: 'flex',
              gap: 14,
              justifyContent: 'center',
              flexWrap: 'wrap',
              animation: 'slideUp 0.7s ease 0.3s both forwards',
            }}>
              <Link to="/campaigns" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '14px 32px',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  color: '#fff', cursor: 'pointer',
                  fontSize: '1rem', fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  🔍 Khám phá chiến dịch
                </button>
              </Link>
              <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '14px 32px',
                  background: 'transparent',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', cursor: 'pointer',
                  fontSize: '1rem', fontWeight: 600,
                  fontFamily: 'var(--font-heading)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.3s ease',
                }}>
                  🚀 Bắt đầu gây quỹ
                </button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              marginTop: 48,
              flexWrap: 'wrap',
              animation: 'fadeIn 1s ease 0.5s both forwards',
            }}>
              {[
                { icon: '🔒', label: 'Thanh toán bảo mật' },
                { icon: '✅', label: 'Đã xác minh' },
                { icon: '📊', label: 'Minh bạch 100%' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{icon}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          animation: 'float 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-disabled)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cuộn xuống</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(180deg, var(--primary-500), transparent)' }} />
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section style={{
        padding: '80px 0',
        background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 12 }}>
              Con số <span className="text-gradient">nói lên tất cả</span>
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>Cộng đồng FundVN đang tạo ra sự thay đổi mỗi ngày</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            <StatsCounter end={mockStats.totalCampaigns} suffix="+" label="Chiến dịch" icon="🎯" />
            <StatsCounter end={mockStats.totalDonors} suffix="+" label="Người ủng hộ" icon="❤️" duration={2200} />
            <StatsCounter end={mockStats.totalRaised} prefix="₫" label="Đã gây quỹ" icon="💰" duration={2500} />
            <StatsCounter end={mockStats.successRate} suffix="%" label="Tỉ lệ thành công" icon="🏆" />
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 480px) {
            .stats-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* ===== CATEGORIES SECTION ===== */}
      <section style={{ padding: '80px 0', background: 'var(--bg-base)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 12 }}>
              Khám phá theo <span className="text-gradient">danh mục</span>
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>Tìm chiến dịch phù hợp với lĩnh vực bạn quan tâm</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {CATEGORIES.map(({ key, label, icon, color }) => (
              <Link
                key={key}
                to={`/campaigns?category=${key}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  padding: '24px 16px',
                  background: 'rgba(22,33,62,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-xl)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},0.1)`;
                    (e.currentTarget as HTMLElement).style.borderColor = color + '40';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 30px rgba(0,0,0,0.3)`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(22,33,62,0.6)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: 10,
                    width: 56, height: 56,
                    background: color + '20',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    {icon}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.85rem', fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    {label}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <style>{`
            @media (max-width: 900px) { .cat-grid { grid-template-columns: repeat(3, 1fr) !important; } }
            @media (max-width: 600px) { .cat-grid { grid-template-columns: repeat(2, 1fr) !important; } }
          `}</style>
        </div>
      </section>

      {/* ===== FEATURED CAMPAIGNS ===== */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-surface) 100%)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 10 }}>
                Chiến dịch <span className="text-gradient">nổi bật</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Những chiến dịch đang được cộng đồng ủng hộ nhiều nhất</p>
            </div>
            <Link to="/campaigns" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'transparent', border: '1px solid rgba(124,58,237,0.4)',
                borderRadius: 'var(--radius-md)', color: 'var(--primary-400)',
                cursor: 'pointer', padding: '9px 20px', fontSize: '0.875rem',
                fontWeight: 600, fontFamily: 'var(--font-body)',
                transition: 'all 0.2s ease',
              }}>
                Xem tất cả →
              </button>
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
            {featuredCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} featured />
            ))}
          </div>
        </div>
      </section>

      {/* ===== URGENT CAMPAIGNS ===== */}
      <section style={{ padding: '80px 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-full)', padding: '4px 12px',
                marginBottom: 12,
              }}>
                <div style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'pulse-glow 1s infinite' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171' }}>Cần hỗ trợ khẩn cấp</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 10 }}>
                Chiến dịch <span style={{ color: '#ef4444' }}>cần ủng hộ</span> ngay
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Những chiến dịch sắp hết hạn và cần sự hỗ trợ gấp</p>
            </div>
            <Link to="/campaigns?sort=deadline" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 'var(--radius-md)', color: '#f87171',
                cursor: 'pointer', padding: '9px 20px', fontSize: '0.875rem',
                fontWeight: 600, fontFamily: 'var(--font-body)',
              }}>
                Xem tất cả →
              </button>
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
            {urgentCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section style={{
        padding: '96px 0',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(124,58,237,0.1), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              Bắt đầu chỉ với <span className="text-gradient">4 bước</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>
              Quy trình đơn giản, minh bạch từ khi khởi tạo đến khi hoàn thành chiến dịch
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, position: 'relative' }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute',
              top: 44, left: '12%', right: '12%',
              height: 1,
              background: 'linear-gradient(90deg, rgba(124,58,237,0.5), rgba(6,182,212,0.5))',
              zIndex: 0,
            }} />
            {HOW_IT_WORKS.map(({ step, icon, title, desc }, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 80, height: 80,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.1))',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: '50%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  position: 'relative',
                  boxShadow: '0 0 30px rgba(124,58,237,0.15)',
                }}>
                  <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{icon}</span>
                  <div style={{
                    position: 'absolute', top: -8, right: -8,
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 7px',
                    fontSize: '0.7rem', fontWeight: 800,
                    color: '#fff',
                  }}>
                    {step}
                  </div>
                </div>
                <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: 10, fontSize: '1rem' }}>{title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 52 }}>
            <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '15px 40px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: '#fff', cursor: 'pointer',
                fontSize: '1rem', fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
              }}>
                🚀 Bắt đầu chiến dịch của bạn
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section style={{ padding: '96px 0', background: 'var(--bg-base)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              Cộng đồng <span className="text-gradient">nói gì</span>
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>Hàng nghìn người đã tin tưởng và sử dụng FundVN</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {TESTIMONIALS.map(({ avatar, name, role, text, stars }, i) => (
              <div
                key={i}
                style={{
                  padding: '28px 24px',
                  background: 'rgba(26,26,46,0.6)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 'var(--radius-xl)',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Quote mark */}
                <div style={{
                  position: 'absolute', top: 20, right: 24,
                  fontSize: '4rem', color: 'rgba(124,58,237,0.15)',
                  fontFamily: 'Georgia', lineHeight: 1,
                }}>
                  "
                </div>
                {/* Stars */}
                <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                  {Array.from({ length: stars }).map((_, j) => (
                    <span key={j} style={{ color: '#f59e0b', fontSize: '0.9rem' }}>⭐</span>
                  ))}
                </div>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  "{text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={avatar} alt={name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-400)' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(135deg, #1a0a2e, #0f0f1a)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.1) 50%, rgba(6,182,212,0.05) 100%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative',
        }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 16 }}>
            Sẵn sàng tạo <span className="text-gradient">sự khác biệt</span>?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: 36 }}>
            Hàng nghìn chiến dịch đang chờ sự ủng hộ của bạn. Mỗi đồng đóng góp đều tạo nên sự thay đổi.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/campaigns" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: '#fff', cursor: 'pointer',
                fontSize: '1rem', fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
              }}>
                💝 Quyên góp ngay hôm nay
              </button>
            </Link>
            <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '14px 32px',
                background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', cursor: 'pointer',
                fontSize: '1rem', fontWeight: 600,
                fontFamily: 'var(--font-heading)',
                backdropFilter: 'blur(10px)',
              }}>
                ✨ Tạo chiến dịch
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
