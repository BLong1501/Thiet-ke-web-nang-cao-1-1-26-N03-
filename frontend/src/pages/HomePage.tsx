import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CampaignCard } from '../components/ui/CampaignCard';
import { mockCampaigns, mockStats } from '../data/mockData';
import { CATEGORY_LABELS, CATEGORY_ICONS, type CampaignCategory } from '../types';

const TRUST_FEATURES = [
  {
    icon: '🔍',
    title: 'Xác thực danh tính',
    desc: 'Mỗi nhà gây quỹ đều được xác minh CCCD/Hộ chiếu và địa chỉ thực tế trước khi ra mắt chiến dịch.',
  },
  {
    icon: '🏦',
    title: 'Minh bạch chi tiêu',
    desc: 'Toàn bộ dòng tiền được ghi nhận theo từng hạng mục, có báo cáo chứng minh từ đối tác kiểm toán.',
  },
  {
    icon: '🔒',
    title: 'Quỹ tín thác đảm bảo',
    desc: 'Tiền quyên góp được giữ trong tài khoản tín thác riêng biệt, chỉ giải ngân theo từng mốc mục tiêu.',
  },
  {
    icon: '📊',
    title: 'Theo dõi giải ngân',
    desc: 'Nhà tài trợ nhận được thông báo và hóa đơn chứng từ theo thời gian thực khi tiền được sử dụng.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01', color: 'var(--primary-container)',
    title: 'Tạo chiến dịch',
    desc: 'Đăng ký, hoàn thiện hồ sơ xác minh và khởi tạo chiến dịch với kế hoạch tài chính chi tiết.',
  },
  {
    step: '02', color: '#0891b2',
    title: 'Cộng đồng ủng hộ',
    desc: 'Chia sẻ câu chuyện đến cộng đồng. Nhận đóng góp an toàn qua nhiều kênh thanh toán.',
  },
  {
    step: '03', color: 'var(--secondary)',
    title: 'Thực thi minh bạch',
    desc: 'Tiền được giải ngân theo từng mốc tiến độ. Cung cấp báo cáo chứng minh đến từng người ủng hộ.',
  },
];

const CATEGORIES: Array<{ key: CampaignCategory; label: string; icon: string; color: string; bg: string }> = [
  { key: 'y-te', label: CATEGORY_LABELS['y-te'], icon: CATEGORY_ICONS['y-te'], color: '#dc2626', bg: '#fef2f2' },
  { key: 'giao-duc', label: CATEGORY_LABELS['giao-duc'], icon: CATEGORY_ICONS['giao-duc'], color: '#d97706', bg: '#fffbeb' },
  { key: 'moi-truong', label: CATEGORY_LABELS['moi-truong'], icon: CATEGORY_ICONS['moi-truong'], color: '#059669', bg: '#f0fdf4' },
  { key: 'cuu-tro', label: CATEGORY_LABELS['cuu-tro'], icon: CATEGORY_ICONS['cuu-tro'], color: '#2563eb', bg: '#eff6ff' },
  { key: 'dong-vat', label: CATEGORY_LABELS['dong-vat'], icon: CATEGORY_ICONS['dong-vat'], color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'cong-dong', label: CATEGORY_LABELS['cong-dong'], icon: CATEGORY_ICONS['cong-dong'], color: '#0891b2', bg: '#ecfeff' },
  { key: 'sang-tao', label: CATEGORY_LABELS['sang-tao'], icon: CATEGORY_ICONS['sang-tao'], color: '#db2777', bg: '#fdf2f8' },
  { key: 'khac', label: CATEGORY_LABELS['khac'], icon: CATEGORY_ICONS['khac'], color: '#64748b', bg: '#f8fafc' },
];

const STATS = [
  { value: '2,5 tỷ', label: 'Đồng đã gây quỹ', color: 'var(--primary-container)' },
  { value: '320+', label: 'Chiến dịch thành công', color: 'var(--secondary)' },
  { value: '18K+', label: 'Nhà tài trợ đóng góp', color: '#0891b2' },
  { value: '96%', label: 'Tỉ lệ đạt mục tiêu', color: '#d97706' },
];

const HomePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CampaignCategory | 'all'>('all');
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    document.title = 'FundTrust - Gây quỹ Minh bạch & Đáng tin cậy';
  }, []);

  const filteredCampaigns = activeCategory === 'all'
    ? mockCampaigns
    : mockCampaigns.filter(c => c.category === activeCategory);

  return (
    <div className="page-enter" style={{ background: 'var(--background)' }}>

      {/* ===== HERO SECTION ===== */}
      <section style={{
        background: 'linear-gradient(160deg, #f0f4ff 0%, var(--surface-container-low) 40%, #f0fdf9 100%)',
        borderBottom: '1px solid var(--outline-variant)',
        padding: '72px 0 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60, width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 64, alignItems: 'center' }}>

            {/* Left - Copy */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 14px', borderRadius: 'var(--radius-full)',
                background: 'var(--primary-fixed)', border: '1px solid rgba(37,99,235,0.2)',
                marginBottom: 24,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-container)', animation: 'pulse-dot 2s infinite' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Nền tảng xác minh 100% A-to-Z
                </span>
              </div>

              <h1 style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700,
                letterSpacing: '-0.03em', lineHeight: 1.15,
                color: 'var(--on-surface)', marginBottom: 20,
              }}>
                Gây quỹ minh bạch.{' '}
                <span style={{ color: 'var(--primary-container)' }}>
                  Trao niềm tin đúng nơi.
                </span>
              </h1>

              <p style={{
                fontSize: '1.0625rem', color: 'var(--on-surface-variant)',
                lineHeight: 1.65, marginBottom: 36, maxWidth: 520,
              }}>
                FundTrust kết nối những câu chuyện cần sự giúp đỡ với cộng đồng sẵn sàng ủng hộ.
                Toàn bộ dòng tiền được xác minh, báo cáo công khai và được kiểm toán độc lập.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
                  <button style={{
                    padding: '13px 28px', background: 'var(--primary-container)',
                    border: 'none', borderRadius: 12, color: '#fff',
                    fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
                    cursor: 'pointer', letterSpacing: '-0.01em',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 14px rgba(37,99,235,0.28)',
                    transition: 'all 0.2s ease',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-container)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                  >
                    Tạo chiến dịch →
                  </button>
                </Link>
                <Link to="/campaigns" style={{ textDecoration: 'none' }}>
                  <button style={{
                    padding: '13px 24px',
                    background: 'var(--surface-container-lowest)',
                    border: '1.5px solid var(--outline-variant)',
                    borderRadius: 12, color: 'var(--on-surface)',
                    fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 500,
                    cursor: 'pointer', letterSpacing: '-0.01em',
                    transition: 'all 0.2s ease',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--outline)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-lowest)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--outline-variant)'; }}
                  >
                    Khám phá chiến dịch
                  </button>
                </Link>
              </div>

              {/* Trust badges */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { icon: '✓', text: '100% A-to-Z xác minh', color: 'var(--secondary)' },
                  { icon: '🏦', text: 'Tài khoản tín thác MB Bank', color: 'var(--primary-container)' },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.875rem', color: b.color, fontWeight: 700 }}>{b.icon}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Featured Campaign Card */}
            <div style={{
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}>
              {/* Campaign preview header */}
              <div style={{ position: 'relative' }}>
                <img
                  src={mockCampaigns[0]?.thumbnail || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80'}
                  alt="Chiến dịch nổi bật"
                  style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(19,27,46,0.4) 0%, transparent 60%)',
                }} />
                <div style={{
                  position: 'absolute', top: 12, left: 12,
                  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                  borderRadius: 'var(--radius-full)', padding: '3px 10px',
                  fontSize: '0.6875rem', fontWeight: 600, color: '#047857',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}>
                  ✓ Đã xác minh
                </div>
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                  borderRadius: 'var(--radius-full)', padding: '3px 10px',
                  fontSize: '0.6875rem', fontWeight: 600, color: 'var(--primary-container)',
                }}>
                  🔥 Đang hot
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--on-surface)', lineHeight: 1.4, marginBottom: 8, letterSpacing: '-0.015em' }}>
                  {mockCampaigns[0]?.title || 'Hỗ trợ trẻ em vùng cao đến trường'}
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 16, lineHeight: 1.5 }}>
                  {mockCampaigns[0]?.shortDesc || 'Mỗi đóng góp của bạn mang lại cơ hội học tập cho các em nhỏ...'}
                </p>
                {/* Progress */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>Tiến độ</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      {mockCampaigns[0] ? Math.round(mockCampaigns[0].raisedAmount / mockCampaigns[0].targetAmount * 100) : 67}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface-container-high)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 'var(--radius-full)',
                      background: 'linear-gradient(90deg, var(--secondary), #10b981)',
                      width: `${mockCampaigns[0] ? Math.min(100, Math.round(mockCampaigns[0].raisedAmount / mockCampaigns[0].targetAmount * 100)) : 67}%`,
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                      }} />
                    </div>
                  </div>
                </div>
                {/* Amounts */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum" 1' }}>
                      {mockCampaigns[0] ? new Intl.NumberFormat('vi-VN').format(mockCampaigns[0].raisedAmount) : '268.000.000'} ₫
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                      mục tiêu {mockCampaigns[0] ? new Intl.NumberFormat('vi-VN').format(mockCampaigns[0].targetAmount) : '400.000.000'} ₫
                    </div>
                  </div>
                  <Link to={`/campaigns/${mockCampaigns[0]?.id || '1'}`} style={{ textDecoration: 'none' }}>
                    <button style={{
                      padding: '9px 18px', background: 'var(--primary-container)',
                      border: 'none', borderRadius: 10, color: '#fff',
                      fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.18s ease',
                    }}>
                      Ủng hộ ngay
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY FUNDTRUST ===== */}
      <section style={{ padding: '80px 0', background: 'var(--surface-container-lowest)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="label-caps" style={{ marginBottom: 12, display: 'block' }}>Điểm khác biệt</span>
            <h2 style={{ marginBottom: 16 }}>Vì sao bạn có thể tin tưởng FundTrust?</h2>
            <p style={{ maxWidth: 560, margin: '0 auto', fontSize: '1rem', color: 'var(--on-surface-variant)' }}>
              Chúng tôi không chỉ là nền tảng gây quỹ — mà còn là hệ thống kiểm toán minh bạch từ đầu đến cuối.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {TRUST_FEATURES.map((f, i) => (
              <div key={i} style={{
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px 24px',
                transition: 'all 0.22s ease',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary-fixed-dim)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--outline-variant)';
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-fixed)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.375rem', marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <h4 style={{ marginBottom: 8, color: 'var(--on-surface)' }}>{f.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
                <div style={{ marginTop: 20 }}>
                  <a href="#" style={{ fontSize: '0.875rem', color: 'var(--primary-container)', fontWeight: 600 }}>Tìm hiểu thêm →</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CAMPAIGNS ===== */}
      <section style={{ padding: '80px 0', background: 'var(--background)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="label-caps" style={{ marginBottom: 10, display: 'block' }}>Đang hoạt động</span>
              <h2 style={{ margin: 0 }}>Những chiến dịch đang tạo nên thay đổi</h2>
            </div>
            <Link to="/campaigns" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '9px 20px', background: 'transparent',
                border: '1.5px solid var(--outline-variant)', borderRadius: 10,
                color: 'var(--on-surface)', fontFamily: 'var(--font-body)',
                fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--outline)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--outline-variant)'; }}
              >
                Xem tất cả →
              </button>
            </Link>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveCategory('all')}
              style={{
                padding: '7px 16px',
                background: activeCategory === 'all' ? 'var(--primary-container)' : 'var(--surface-container-lowest)',
                border: `1px solid ${activeCategory === 'all' ? 'var(--primary-container)' : 'var(--outline-variant)'}`,
                borderRadius: 'var(--radius-full)',
                color: activeCategory === 'all' ? '#fff' : 'var(--on-surface-variant)',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.18s ease',
              }}
            >
              🏷️ Tất cả
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '7px 16px',
                  background: activeCategory === cat.key ? cat.color : 'var(--surface-container-lowest)',
                  border: `1px solid ${activeCategory === cat.key ? cat.color : 'var(--outline-variant)'}`,
                  borderRadius: 'var(--radius-full)',
                  color: activeCategory === cat.key ? '#fff' : 'var(--on-surface-variant)',
                  fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.18s ease',
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Campaign Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {filteredCampaigns.slice(0, 6).map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED CAMPAIGN (full width) ===== */}
      <section style={{ padding: '0 0 80px', background: 'var(--background)' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, var(--surface-container-low) 0%, #eff6ff 100%)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px',
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: 48,
            alignItems: 'center',
          }}>
            {/* Left */}
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 12px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                  fontSize: '0.75rem', fontWeight: 600, color: '#047857',
                }}>✓ Chiến dịch được Xác minh</span>
                <span style={{
                  padding: '3px 12px', borderRadius: 'var(--radius-full)',
                  background: 'var(--primary-fixed)', border: '1px solid rgba(37,99,235,0.2)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-container)',
                }}>⭐ Nổi bật tuần này</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--on-surface)', marginBottom: 12, letterSpacing: '-0.025em', lineHeight: 1.3 }}>
                {mockCampaigns[1]?.title || 'Xây dựng trường học cho 250 trẻ em vùng cao Sơn La'}
              </h3>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: 24, lineHeight: 1.7 }}>
                {mockCampaigns[1]?.shortDesc || 'Dự án xây dựng trường học kiên cố, đảm bảo môi trường học tập an toàn cho trẻ em vùng sâu vùng xa.'}
              </p>
              <div style={{ display: 'flex', gap: 32, marginBottom: 28 }}>
                {[
                  { label: 'Số tiền cần', value: `${new Intl.NumberFormat('vi-VN').format(mockCampaigns[1]?.targetAmount || 500000000)} ₫` },
                  { label: 'Đã gây quỹ', value: `${new Intl.NumberFormat('vi-VN').format(mockCampaigns[1]?.raisedAmount || 320000000)} ₫` },
                  { label: 'Người ủng hộ', value: `${(mockCampaigns[1]?.donorCount || 1247).toLocaleString('vi-VN')}` },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum" 1' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Link to={`/campaigns/${mockCampaigns[1]?.id || '2'}`} style={{ textDecoration: 'none' }}>
                  <button style={{
                    padding: '11px 24px', background: 'var(--primary-container)',
                    border: 'none', borderRadius: 12, color: '#fff',
                    fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600,
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                    transition: 'all 0.18s ease',
                  }}>
                    Xem chiến dịch →
                  </button>
                </Link>
                <button style={{
                  padding: '11px 20px', background: 'transparent',
                  border: '1.5px solid var(--outline-variant)', borderRadius: 12,
                  color: 'var(--on-surface)', fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.18s ease',
                }}>
                  📤 Chia sẻ
                </button>
              </div>
            </div>
            {/* Right - Image */}
            <div>
              <img
                src={mockCampaigns[1]?.thumbnail || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80'}
                alt="Featured campaign"
                style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section style={{ padding: '80px 0', background: 'var(--surface-container-lowest)', borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="label-caps" style={{ marginBottom: 12, display: 'block' }}>Quy trình</span>
            <h2>Gây quỹ chỉ với 3 bước</h2>
            <p style={{ maxWidth: 480, margin: '12px auto 0', color: 'var(--on-surface-variant)' }}>
              Nhanh chóng, minh bạch và hoàn toàn được kiểm soát từ đầu đến cuối.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                {/* Connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 28, left: 'calc(50% + 40px)', right: 'calc(-50% + 40px)',
                    height: 1, background: 'linear-gradient(90deg, var(--outline-variant), transparent)',
                    zIndex: 0,
                  }} />
                )}
                <div style={{
                  width: 56, height: 56, borderRadius: 'var(--radius-full)',
                  background: step.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', fontWeight: 800, letterSpacing: '-0.01em',
                  margin: '0 auto 20px', position: 'relative', zIndex: 1,
                  boxShadow: `0 4px 14px ${step.color}40`,
                }}>
                  {step.step}
                </div>
                <h4 style={{ marginBottom: 10, color: 'var(--on-surface)', letterSpacing: '-0.015em' }}>{step.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section style={{ padding: '64px 0', background: 'var(--background)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px 24px', textAlign: 'center',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{
                  fontSize: '2rem', fontWeight: 800, color: s.color,
                  letterSpacing: '-0.03em', marginBottom: 6,
                  fontFeatureSettings: '"tnum" 1',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: '64px 48px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -60, right: -60, width: 240, height: 240,
              background: 'rgba(255,255,255,0.06)', borderRadius: '50%',
            }} />
            <div style={{
              position: 'absolute', bottom: -40, left: -40, width: 180, height: 180,
              background: 'rgba(255,255,255,0.04)', borderRadius: '50%',
            }} />
            <h2 style={{ color: '#fff', marginBottom: 16, position: 'relative', letterSpacing: '-0.025em' }}>
              Bắt đầu tạo tác động hôm nay.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 36px', fontSize: '1rem', position: 'relative' }}>
              Tham gia cùng hàng nghìn nhà gây quỹ đang sử dụng FundTrust để tạo thay đổi có thể đo lường được.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '13px 28px',
                  background: '#fff',
                  border: 'none', borderRadius: 12,
                  color: 'var(--primary)', fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  transition: 'all 0.18s ease',
                }}>
                  Tạo chiến dịch
                </button>
              </Link>
              <Link to="/campaigns" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '13px 24px',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  borderRadius: 12, color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'}
                >
                  Khám phá chiến dịch →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
