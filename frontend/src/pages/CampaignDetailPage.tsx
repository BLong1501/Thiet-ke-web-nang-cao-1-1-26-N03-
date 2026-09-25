import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockCampaigns, mockDonations } from '../data/mockData';
import { DonationModal } from '../components/ui/DonationModal';
import ProgressBar from '../components/ui/ProgressBar';
import { formatCurrency, getDaysLeft, getProgress, formatDate } from '../services/api';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock chart data
const CHART_DATA = [
  { date: '01/09', amount: 12000000 },
  { date: '05/09', amount: 28000000 },
  { date: '10/09', amount: 67000000 },
  { date: '15/09', amount: 145000000 },
  { date: '18/09', amount: 220000000 },
  { date: '20/09', amount: 312000000 },
  { date: '22/09', amount: 378000000 },
];

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'story' | 'updates' | 'donors' | 'report'>('story');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const campaign = mockCampaigns.find(c => c.id === id) || mockCampaigns[0];
  const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);
  const daysLeft = getDaysLeft(campaign.deadline);
  const donations = mockDonations.slice(0, 5);

  useEffect(() => {
    document.title = `${campaign.title} - FundVN`;
    window.scrollTo(0, 0);
  }, [campaign.title]);

  const tabs = [
    { key: 'story', label: '📖 Câu chuyện' },
    { key: 'updates', label: '📣 Cập nhật' },
    { key: 'donors', label: `❤️ Người ủng hộ (${campaign.donorCount.toLocaleString('vi-VN')})` },
    { key: 'report', label: '📊 Báo cáo' },
  ];

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Breadcrumb */}
      <div style={{
        background: 'rgba(10,10,20,0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Trang chủ</Link>
          <span style={{ color: 'var(--text-disabled)' }}>›</span>
          <Link to="/campaigns" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Chiến dịch</Link>
          <span style={{ color: 'var(--text-disabled)' }}>›</span>
          <span style={{ color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.title}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
          {/* Left: Main content */}
          <div>
            {/* Category badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px', marginBottom: 16,
              fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-400)',
            }}>
              {CATEGORY_ICONS[campaign.category]} {CATEGORY_LABELS[campaign.category]}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
              lineHeight: 1.3,
              marginBottom: 16,
            }}>
              {campaign.title}
            </h1>

            {/* Creator info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 24,
              padding: '12px 16px',
              background: 'rgba(26,26,46,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <img
                src={campaign.creator.avatar || ''}
                alt={campaign.creator.name}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(124,58,237,0.4)' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{campaign.creator.name}</span>
                  {campaign.creator.isVerified && (
                    <span style={{
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 7px', fontSize: '0.68rem',
                      color: 'var(--emerald-400)', fontWeight: 700,
                    }}>
                      ✓ Đã xác minh
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Người tổ chức · Đã tham gia từ {formatDate(campaign.creator.joinedAt)}
                </span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button style={{
                  padding: '7px 14px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
                }}>
                  Theo dõi
                </button>
                <button style={{
                  padding: '7px 14px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
                }}>
                  Nhắn tin
                </button>
              </div>
            </div>

            {/* Main image */}
            <div style={{
              position: 'relative', borderRadius: 'var(--radius-xl)',
              overflow: 'hidden', marginBottom: 24,
              height: 400,
              cursor: 'pointer',
            }} onClick={() => setSelectedImage(campaign.thumbnail)}>
              <img
                src={campaign.thumbnail}
                alt={campaign.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(10,10,20,0.4) 0%, transparent 60%)',
              }} />
              <div style={{
                position: 'absolute', bottom: 16, right: 16,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-md)', padding: '8px 12px',
                fontSize: '0.8rem', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🔍 Phóng to
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 4, marginBottom: 28,
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              overflowX: 'auto',
            }}>
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  style={{
                    padding: '12px 18px',
                    background: 'none', border: 'none',
                    color: activeTab === key ? 'var(--primary-400)' : 'var(--text-muted)',
                    fontWeight: activeTab === key ? 700 : 400,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    borderBottom: `2px solid ${activeTab === key ? 'var(--primary-500)' : 'transparent'}`,
                    marginBottom: -1,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'story' && (
              <div>
                <div style={{
                  background: 'rgba(26,26,46,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '28px',
                }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 16 }}>Về chiến dịch này</h3>
                  <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    {campaign.description}
                  </p>
                  <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Với sự hỗ trợ từ cộng đồng, chúng tôi đã tiến được {getProgress(campaign.raisedAmount, campaign.targetAmount)}% mục tiêu. Mỗi khoản đóng góp, dù lớn hay nhỏ, đều mang ý nghĩa đặc biệt.
                  </p>
                  <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                    Toàn bộ số tiền gây quỹ sẽ được sử dụng minh bạch và có báo cáo đầy đủ. Chúng tôi cam kết sử dụng đúng mục đích và công bố kết quả sau khi chiến dịch kết thúc.
                  </p>
                </div>

                {/* Tags */}
                {campaign.tags && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
                    {campaign.tags.map(tag => (
                      <span key={tag} style={{
                        padding: '4px 12px',
                        background: 'rgba(124,58,237,0.1)',
                        border: '1px solid rgba(124,58,237,0.2)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.78rem', color: 'var(--primary-400)',
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'updates' && (
              <div>
                {[
                  { date: '20/09/2026', title: 'Cập nhật tiến độ tháng 9', content: 'Chúng tôi vui mừng thông báo đã đạt 75% mục tiêu! Quá trình xây dựng đang diễn ra suôn sẻ. Dự kiến hoàn thành vào tháng 11.' },
                  { date: '10/09/2026', title: 'Khởi công xây dựng', content: 'Ngày 10/9, chúng tôi đã chính thức khởi công xây dựng. Cảm ơn tất cả những nhà hảo tâm đã đồng hành!' },
                ].map((update, i) => (
                  <div key={i} style={{
                    padding: '24px',
                    background: 'rgba(26,26,46,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 'var(--radius-xl)',
                    marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', margin: 0 }}>{update.title}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }}>{update.date}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{update.content}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'donors' && (
              <div>
                {donations.map((donation, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px',
                    background: 'rgba(26,26,46,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 10,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', flexShrink: 0,
                    }}>
                      {donation.isAnonymous ? '🎭' : '👤'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 3 }}>
                        {donation.isAnonymous ? 'Ẩn danh' : donation.donor?.name}
                      </div>
                      {donation.message && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          "{donation.message}"
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: 800, fontSize: '1rem',
                        background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>
                        {formatCurrency(donation.amount)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-disabled)' }}>
                        {formatDate(donation.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'report' && (
              <div>
                <div style={{
                  background: 'rgba(26,26,46,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  marginBottom: 20,
                }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 20, fontSize: '1.1rem' }}>
                    📈 Biểu đồ tiến độ gây quỹ
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={CHART_DATA}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10 }}
                        labelStyle={{ color: 'var(--text-secondary)' }}
                        formatter={(v: number) => [formatCurrency(v), 'Đã gây quỹ']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={2} fill="url(#colorAmount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <button style={{
                    flex: 1, padding: '12px',
                    background: 'rgba(26,26,46,0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.875rem',
                    fontFamily: 'var(--font-body)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    📄 Xuất PDF
                  </button>
                  <button style={{
                    flex: 1, padding: '12px',
                    background: 'rgba(26,26,46,0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.875rem',
                    fontFamily: 'var(--font-body)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    📊 Xuất CSV
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Sticky donation panel */}
          <div style={{ position: 'sticky', top: 90 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(26,26,46,0.9), rgba(22,33,62,0.8))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              {/* Amount raised */}
              <div style={{ marginBottom: 18 }}>
                <div style={{
                  fontSize: '1.8rem', fontWeight: 900,
                  fontFamily: 'var(--font-heading)',
                  background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: 4,
                }}>
                  {formatCurrency(campaign.raisedAmount)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  đã đạt được từ mục tiêu {formatCurrency(campaign.targetAmount)}
                </div>
              </div>

              {/* Progress */}
              <ProgressBar value={progress} height={10} />

              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
                <span style={{
                  fontSize: '1.1rem', fontWeight: 800,
                  color: progress >= 100 ? 'var(--emerald-400)' : 'var(--primary-400)',
                }}>
                  {progress}%
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>mục tiêu</span>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                {[
                  { value: campaign.donorCount.toLocaleString('vi-VN'), label: 'người ủng hộ', icon: '❤️' },
                  { value: `${daysLeft}`, label: 'ngày còn lại', icon: '⏳' },
                  { value: `${progress}%`, label: 'hoàn thành', icon: '🎯' },
                ].map(({ value, label, icon }) => (
                  <div key={label} style={{
                    textAlign: 'center', padding: '12px 8px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontSize: '1rem', marginBottom: 2 }}>{icon}</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{value}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Donate button */}
              <button
                onClick={() => setShowDonateModal(true)}
                style={{
                  width: '100%', padding: '16px',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  color: '#fff', cursor: 'pointer',
                  fontSize: '1.05rem', fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                  boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
                  marginBottom: 12,
                  transition: 'all 0.3s ease',
                  letterSpacing: '0.01em',
                }}
              >
                💝 Quyên góp ngay
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                {['📤 Chia sẻ', '🔖 Lưu', '🚩 Báo cáo'].map((action) => (
                  <button key={action} style={{
                    flex: 1, padding: '10px 8px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '0.75rem',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {action}
                  </button>
                ))}
              </div>

              {/* Security note */}
              <div style={{
                marginTop: 16, padding: '10px 14px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.78rem', color: 'var(--emerald-400)',
              }}>
                🔒 Thanh toán bảo mật SSL 256-bit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <>
          <div onClick={() => setSelectedImage(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={selectedImage} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }} />
            <button onClick={() => setSelectedImage(null)} style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer',
              padding: '10px 14px', fontSize: '1.1rem',
            }}>✕</button>
          </div>
        </>
      )}

      {/* Donation Modal */}
      {showDonateModal && (
        <DonationModal
          campaign={campaign}
          onClose={() => setShowDonateModal(false)}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .campaign-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default CampaignDetailPage;
