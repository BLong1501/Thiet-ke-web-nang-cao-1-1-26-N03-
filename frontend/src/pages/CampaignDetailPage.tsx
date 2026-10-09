import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockCampaigns, mockDonations } from '../data/mockData';
import { DonationModal } from '../components/ui/DonationModal';
import ProgressBar from '../components/ui/ProgressBar';
import { CampaignCard } from '../components/ui/CampaignCard';
import { formatCurrency, getDaysLeft, getProgress, formatDate } from '../services/api';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock chart data for donation timeline
const CHART_DATA = [
  { date: '01/09', amount: 12000000 },
  { date: '05/09', amount: 28000000 },
  { date: '10/09', amount: 67000000 },
  { date: '15/09', amount: 145000000 },
  { date: '18/09', amount: 220000000 },
  { date: '20/09', amount: 312000000 },
  { date: '22/09', amount: 378000000 },
];

const DISBURSEMENT_RECORDS = [
  {
    id: 'DSB-001',
    date: '15/09/2026',
    purpose: 'Tạm ứng đợt 1 - Mua vật liệu xây dựng (Xi măng, gạch, thép)',
    recipient: 'Công ty VLXD Hà Giang Xanh',
    amount: 150000000,
    proofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80',
    status: 'Đã giải ngân & nghiệm thu',
  },
  {
    id: 'DSB-002',
    date: '22/09/2026',
    purpose: 'Chi trả nhân công thi công móng và khung nhà lớp học',
    recipient: 'Đội thi công bản Lũng Cú',
    amount: 75000000,
    proofUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&q=80',
    status: 'Đã giải ngân & nghiệm thu',
  },
];

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'story' | 'updates' | 'donors' | 'report'>('story');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const campaign = mockCampaigns.find((c) => c.id === id) || mockCampaigns[0];
  const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);
  const daysLeft = getDaysLeft(campaign.deadline);
  const donations = mockDonations;
  const relatedCampaigns = mockCampaigns.filter((c) => c.id !== campaign.id).slice(0, 3);

  useEffect(() => {
    document.title = `${campaign.title} - FundTrust`;
    window.scrollTo(0, 0);
  }, [campaign.title, id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const tabs = [
    { key: 'story', label: '📖 Câu chuyện hoàn cảnh' },
    { key: 'updates', label: `📣 Cập nhật tiến độ (${campaign.updates?.length || 2})` },
    { key: 'donors', label: `❤️ Danh sách ủng hộ (${campaign.donorCount.toLocaleString('vi-VN')})` },
    { key: 'report', label: '📊 Sao kê & Minh bạch tài chính' },
  ];

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Breadcrumb Bar */}
      <div
        style={{
          background: 'var(--surface-container-low)',
          borderBottom: '1px solid var(--outline-variant)',
          padding: '12px 0',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
          <Link to="/" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none' }}>
            Trang chủ
          </Link>
          <span style={{ color: 'var(--outline)' }}>/</span>
          <Link to="/campaigns" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none' }}>
            Chiến dịch
          </Link>
          <span style={{ color: 'var(--outline)' }}>/</span>
          <span
            style={{
              color: 'var(--primary)',
              fontWeight: 500,
              maxWidth: 320,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {campaign.title}
          </span>
        </div>
      </div>

      <div className="container" style={{ padding: '36px var(--gutter)' }}>
        {/* Top Header Section */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--primary-fixed)',
                color: 'var(--primary)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {CATEGORY_ICONS[campaign.category]} {CATEGORY_LABELS[campaign.category]}
            </span>
            <span
              style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              ✓ Đã xác minh thực địa KYC
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.5rem, 3.2vw, 2.25rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--on-surface)',
              lineHeight: 1.3,
              margin: '0 0 16px',
            }}
          >
            {campaign.title}
          </h1>

          {/* Organizer Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: 'max-content',
            }}
          >
            <img
              src={campaign.creator.avatar || 'https://i.pravatar.cc/150?img=1'}
              alt={campaign.creator.name}
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
                  {campaign.creator.name}
                </span>
                <span style={{ color: 'var(--primary)', fontSize: '0.9rem' }} title="Đã xác minh danh tính CCCD/VNeID">
                  🛡️
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                Tổ chức đại diện • Đã thực hiện gây quỹ minh bạch từ {campaign.creator.joinedAt}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
          {/* Main Column */}
          <div>
            {/* Primary Cover Image */}
            <div
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                position: 'relative',
                height: 420,
                border: '1px solid var(--outline-variant)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: 32,
              }}
            >
              <img
                src={campaign.thumbnail}
                alt={campaign.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Tab navigation */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--outline-variant)',
                gap: 8,
                marginBottom: 28,
                overflowX: 'auto',
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    padding: '12px 18px',
                    border: 'none',
                    borderBottom: `2.5px solid ${activeTab === tab.key ? 'var(--primary-container)' : 'transparent'}`,
                    background: 'transparent',
                    color: activeTab === tab.key ? 'var(--primary)' : 'var(--on-surface-variant)',
                    fontWeight: activeTab === tab.key ? 700 : 500,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: 1. STORY */}
            {activeTab === 'story' && (
              <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '32px' }}>
                <div style={{ fontSize: '1.0625rem', lineHeight: 1.8, color: 'var(--on-surface)', marginBottom: 28 }}>
                  <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>
                    {campaign.shortDesc}
                  </p>
                  <p>{campaign.description}</p>
                  <p>
                    Theo khảo sát thực tế tại địa bàn, tình trạng cơ sở vật chất xuống cấp nghiêm trọng gây ảnh hưởng lớn đến đời sống sinh hoạt và tương lai của các đối tượng thụ hưởng. Chiến dịch cam kết 100% số tiền sau khi đóng quỹ sẽ được giải ngân trực tiếp theo từng giai đoạn và có hóa đơn, chứng từ thanh toán công khai.
                  </p>
                </div>

                {/* Impact highlights */}
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16, color: 'var(--on-surface)' }}>
                  🎯 Kế hoạch phân bổ ngân sách dự kiến:
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
                  {[
                    { label: 'Cơ sở vật chất & Vật tư', pct: '65%', desc: 'Thi công xây dựng, trang thiết bị trực tiếp' },
                    { label: 'Hỗ trợ khẩn cấp / Dinh dưỡng', pct: '25%', desc: 'Thuốc men, nhu yếu phẩm thiết yếu' },
                    { label: 'Quản lý & Giám sát thực địa', pct: '10%', desc: 'Chi phí vận chuyển & thẩm định chứng từ' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                        {item.pct}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4, color: 'var(--on-surface)' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{item.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Transparency Commitment Box */}
                <div style={{ padding: '20px', background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe', display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: '2rem' }}>🛡️</span>
                  <div>
                    <h4 style={{ margin: '0 0 4px', color: '#1e40af', fontSize: '0.9375rem' }}>
                      Cam kết bảo vệ nhà hảo tâm 100%
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                      Tiền quyên góp được lưu trữ tại tài khoản ký quỹ trung gian của ngân hàng đối tác. Quỹ chỉ giải ngân khi người đại diện cung cấp đầy đủ hóa đơn đỏ, hợp đồng dịch vụ và biên bản nghiệm thu hợp lệ.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. UPDATES */}
            {activeTab === 'updates' && (
              <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '32px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 24, color: 'var(--on-surface)' }}>
                  Nhật ký tiến độ thực hiện
                </h3>

                <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid var(--primary-fixed)' }}>
                  {[
                    {
                      date: '24/09/2026',
                      title: 'Hoàn thành đổ bê tông phần móng & dựng cột khung trường học',
                      content: 'Đội thi công đã hoàn tất nghiệm thu đợt 1. Toàn bộ hình ảnh thực địa và hóa đơn mua sắm vật liệu đã được đính kèm vào mục Sao kê.',
                      images: ['https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?w=400&q=80'],
                    },
                    {
                      date: '10/09/2026',
                      title: 'Khởi công dự án và tiếp nhận máy móc san lấp mặt bằng',
                      content: 'Lễ khởi công có sự chứng kiến của chính quyền địa phương xã và đại diện các bậc phụ huynh.',
                      images: ['https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&q=80'],
                    },
                  ].map((upd, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: 32 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: -31,
                          top: 4,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: 'var(--primary-container)',
                          border: '3px solid #fff',
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>
                        {upd.date}
                      </span>
                      <h4 style={{ margin: '6px 0 10px', fontSize: '1rem', color: 'var(--on-surface)' }}>
                        {upd.title}
                      </h4>
                      <p style={{ margin: '0 0 14px', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                        {upd.content}
                      </p>
                      {upd.images && (
                        <div style={{ display: 'flex', gap: 12 }}>
                          {upd.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Minh chứng"
                              style={{ width: 140, height: 90, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--outline-variant)' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. DONORS */}
            {activeTab === 'donors' && (
              <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                    Danh sách những tấm lòng vàng ({donations.length})
                  </h3>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                    Cập nhật thời gian thực
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {donations.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: 'var(--surface-container-low)',
                        borderRadius: 12,
                        border: '1px solid var(--outline-variant)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: d.isAnonymous ? 'var(--surface-container-high)' : 'var(--primary-fixed)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                          }}
                        >
                          {d.isAnonymous ? '👤' : (d.donor?.name || 'K')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface)' }}>
                            {d.isAnonymous ? 'Nhà hảo tâm ẩn danh' : d.donor?.name || 'Ủng hộ viên'}
                          </div>
                          {d.message && (
                            <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', marginTop: 2 }}>
                              "{d.message}"
                            </div>
                          )}
                          <div style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: 2 }}>
                            {formatDate(d.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                          +{formatCurrency(d.amount)}
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 10 }}>
                          ✓ Đã ghi sổ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. REPORT & TRANSPARENCY */}
            {activeTab === 'report' && (
              <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                      Sổ cái sao kê & Chứng từ tài chính
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                      Mã hợp đồng giám sát quỹ: <strong>FT-ESCROW-2026-HG01</strong> (Ngân hàng đối tác bảo chứng)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('Đang tạo tệp báo cáo sao kê điện tử PDF/Excel...')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid var(--outline-variant)',
                      background: 'var(--surface-container-low)',
                      color: 'var(--primary)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    📥 Tải bản sao kê đầy đủ (PDF/Excel)
                  </button>
                </div>

                {/* Financial Summary KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
                  <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>Tổng quyên góp nhận vào</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {formatCurrency(campaign.raisedAmount)}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>Đã giải ngân thực tế</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>
                      {formatCurrency(225000000)}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>Số dư tồn ký quỹ bảo lãnh</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                      {formatCurrency(campaign.raisedAmount - 225000000)}
                    </div>
                  </div>
                </div>

                {/* Disbursement Ledger Table */}
                <h4 style={{ margin: '0 0 14px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  Chi tiết các khoản đã chi trả & Nghiệm thu
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', color: 'var(--on-surface-variant)' }}>Mã đợt</th>
                        <th style={{ padding: '10px 12px', color: 'var(--on-surface-variant)' }}>Ngày</th>
                        <th style={{ padding: '10px 12px', color: 'var(--on-surface-variant)' }}>Nội dung chi</th>
                        <th style={{ padding: '10px 12px', color: 'var(--on-surface-variant)' }}>Bên thụ hưởng</th>
                        <th style={{ padding: '10px 12px', color: 'var(--on-surface-variant)', textAlign: 'right' }}>Số tiền</th>
                        <th style={{ padding: '10px 12px', color: 'var(--on-surface-variant)', textAlign: 'center' }}>Chứng từ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DISBURSEMENT_RECORDS.map((rec) => (
                        <tr key={rec.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{rec.id}</td>
                          <td style={{ padding: '12px' }}>{rec.date}</td>
                          <td style={{ padding: '12px' }}>{rec.purpose}</td>
                          <td style={{ padding: '12px' }}>{rec.recipient}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            -{formatCurrency(rec.amount)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedProof(rec.proofUrl)}
                              style={{
                                background: 'var(--primary-fixed)',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 10px',
                                color: 'var(--primary)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              🔍 Xem hóa đơn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Donation progression chart */}
                <div style={{ marginTop: 32 }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                    Biểu đồ tăng trưởng dòng tiền gây quỹ
                  </h4>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={CHART_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--outline-variant)" />
                        <XAxis dataKey="date" tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--on-surface-variant)', fontSize: 11 }} tickFormatter={(val) => `${val / 1000000}tr`} />
                        <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Tổng quỹ lũy kế']} />
                        <Area type="monotone" dataKey="amount" stroke="var(--primary-container)" fill="var(--primary-fixed)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Sidebar Right Column */}
          <div style={{ position: 'sticky', top: 84 }}>
            <div
              style={{
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {/* Target & Raised Numbers */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Đã vận động được</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', margin: '4px 0' }}>
                  {formatCurrency(campaign.raisedAmount)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                  mục tiêu: <strong>{formatCurrency(campaign.targetAmount)}</strong>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: 20 }}>
                <ProgressBar value={progress} height={10} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{progress}% đạt được</span>
                  <span style={{ color: 'var(--on-surface-variant)' }}>{campaign.donorCount} lượt ủng hộ</span>
                </div>
              </div>

              {/* Meta stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px', background: 'var(--surface-container-low)', borderRadius: 12, marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Thời gian còn lại</div>
                  <strong style={{ fontSize: '1.1rem', color: daysLeft <= 7 ? '#dc2626' : 'var(--on-surface)' }}>
                    {daysLeft > 0 ? `${daysLeft} ngày` : 'Đã kết thúc'}
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Hạn chót</div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--on-surface)' }}>
                    {formatDate(campaign.deadline)}
                  </strong>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => setShowDonateModal(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--primary-container)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                  transition: 'all 0.18s ease',
                  marginBottom: 12,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-container)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                💝 Quyên góp ngay
              </button>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShare}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 12,
                  border: '1.5px solid var(--outline-variant)',
                  background: 'var(--surface-container-lowest)',
                  color: 'var(--on-surface)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-container-lowest)')}
              >
                <span>🔗</span> {copiedShare ? '✓ Đã sao chép liên kết!' : 'Chia sẻ chiến dịch'}
              </button>

              {/* Trust badge */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--outline-variant)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                🔒 Giao dịch mã hóa an toàn 256-bit qua cổng VietQR & ngân hàng.
              </div>
            </div>
          </div>
        </div>

        {/* Related Campaigns Section */}
        {relatedCampaigns.length > 0 && (
          <div style={{ marginTop: 64, paddingTop: 40, borderTop: '1px solid var(--outline-variant)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--on-surface)', marginBottom: 24 }}>
              Các chiến dịch liên quan khác
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {relatedCampaigns.map((rc) => (
                <CampaignCard key={rc.id} campaign={rc} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      {selectedProof && (
        <div
          onClick={() => setSelectedProof(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 640, width: '100%', background: '#fff', borderRadius: 12, padding: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong>Chứng từ / Hóa đơn nghiệm thu</strong>
              <button onClick={() => setSelectedProof(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <img src={selectedProof} alt="Chứng từ" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {showDonateModal && (
        <DonationModal
          campaign={campaign}
          onClose={() => setShowDonateModal(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};

export default CampaignDetailPage;
