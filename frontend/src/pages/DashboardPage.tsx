import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { mockCampaigns, mockDonations } from '../data/mockData';
import { formatCurrency, getProgress, getDaysLeft, formatDate } from '../services/api';
import ProgressBar from '../components/ui/ProgressBar';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];
const DONATION_TREND = MONTHS.map((m, i) => ({
  month: m,
  received: (25 + i * 15) * 1000000,
  donors: 40 + i * 22,
}));

const PIE_DATA = [
  { name: 'Y tế & Sức khỏe', value: 38, color: '#dc2626' },
  { name: 'Giáo dục', value: 30, color: '#d97706' },
  { name: 'Môi trường', value: 16, color: '#059669' },
  { name: 'Cứu trợ thiên tai', value: 11, color: '#2563eb' },
  { name: 'Khác', value: 5, color: '#64748b' },
];

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'donations' | 'transparency'>('overview');

  useEffect(() => {
    document.title = 'Dashboard Quản trị - FundTrust';
  }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const myCampaigns = mockCampaigns;
  const recentDonations = mockDonations;

  const totalRaised = myCampaigns.reduce((s, c) => s + c.raisedAmount, 0);
  const totalDonors = myCampaigns.reduce((s, c) => s + c.donorCount, 0);

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--background)', padding: '36px 0 80px' }}>
      <div className="container">
        {/* Header Section */}
        <div
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 32,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>
              👋 Chào mừng bạn quay trở lại,
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '1.75rem', fontWeight: 800, color: 'var(--on-surface)' }}>
              {user?.name || 'Nguyễn Văn An'}
              {user?.isVerified && (
                <span title="Tài khoản đã xác minh KYC" style={{ marginLeft: 8, fontSize: '1.1rem' }}>
                  🛡️
                </span>
              )}
            </h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: 'var(--primary-fixed)',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {user?.role === 'admin' ? '🛡️ Quản trị viên' : user?.role === 'fundraiser' ? '🎯 Người gây quỹ' : '👤 Nhà hảo tâm'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                Tài khoản hoạt động từ {user?.joinedAt || '15/01/2024'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
              <button
                type="button"
                style={{
                  padding: '11px 22px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--primary-container)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(37,99,235,0.25)',
                }}
              >
                + Khởi tạo chiến dịch
              </button>
            </Link>
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <button
                type="button"
                style={{
                  padding: '11px 18px',
                  borderRadius: 10,
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-lowest)',
                  color: 'var(--on-surface)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                ⚙️ Cài đặt hồ sơ
              </button>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 28,
            borderBottom: '1px solid var(--outline-variant)',
            paddingBottom: 4,
          }}
        >
          {[
            { id: 'overview', label: '📊 Tổng quan hoạt động' },
            { id: 'campaigns', label: `🎯 Chiến dịch của tôi (${myCampaigns.length})` },
            { id: 'donations', label: `❤️ Lịch sử quyên góp (${recentDonations.length})` },
            { id: 'transparency', label: '📑 Sổ cái sao kê & Giải ngân' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: `2.5px solid ${activeTab === t.id ? 'var(--primary-container)' : 'transparent'}`,
                background: 'transparent',
                color: activeTab === t.id ? 'var(--primary)' : 'var(--on-surface-variant)',
                fontWeight: activeTab === t.id ? 700 : 500,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
              {[
                { label: 'Tổng quỹ đã vận động', val: formatCurrency(totalRaised), color: 'var(--primary)', icon: '💰' },
                { label: 'Lượt nhà hảo tâm chung tay', val: totalDonors.toLocaleString('vi-VN'), color: '#059669', icon: '❤️' },
                { label: 'Chiến dịch đang hoạt động', val: `${myCampaigns.length} dự án`, color: '#d97706', icon: '🚀' },
                { label: 'Tỷ lệ giải ngân minh bạch', val: '100% đúng hạn', color: '#2563eb', icon: '✓' },
              ].map((k, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{k.label}</span>
                    <span style={{ fontSize: '1.25rem' }}>{k.icon}</span>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: k.color, letterSpacing: '-0.02em' }}>
                    {k.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24, marginBottom: 32 }}>
              {/* Cash flow AreaChart */}
              <div
                style={{
                  background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                    Tăng trưởng quỹ tiếp nhận qua các tháng
                  </h3>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Năm 2026</span>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={DONATION_TREND}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--outline-variant)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--on-surface-variant)', fontSize: 11 }} tickFormatter={(val) => `${val / 1000000}tr`} />
                      <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Tiền quỹ']} />
                      <Area type="monotone" dataKey="received" stroke="var(--primary-container)" fill="var(--primary-fixed)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown PieChart */}
              <div
                style={{
                  background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  Phân bổ theo danh mục tài trợ
                </h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={PIE_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {PIE_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val}%`, 'Tỷ trọng']} />
                      <Legend formatter={(val) => <span style={{ fontSize: '0.75rem', color: 'var(--on-surface)' }}>{val}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Summary Table */}
            <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  Các chiến dịch đang tiếp nhận ủng hộ
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Xem tất cả →
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--outline-variant)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Chiến dịch</th>
                      <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Mục tiêu</th>
                      <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Đã đạt</th>
                      <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Tiến độ</th>
                      <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCampaigns.slice(0, 3).map((c) => {
                      const prog = getProgress(c.raisedAmount, c.targetAmount);
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <img src={c.thumbnail} alt={c.title} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                              <div>
                                <Link to={`/campaigns/${c.id}`} style={{ fontWeight: 600, color: 'var(--on-surface)', textDecoration: 'none' }}>
                                  {c.title}
                                </Link>
                                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Hạn chót: {formatDate(c.deadline)}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatCurrency(c.targetAmount)}</td>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(c.raisedAmount)}</td>
                          <td style={{ padding: '14px 16px', width: 140 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>{prog}%</div>
                            <ProgressBar value={prog} height={6} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <Link to={`/campaigns/${c.id}`} style={{ textDecoration: 'none' }}>
                              <button
                                type="button"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: '1px solid var(--outline-variant)',
                                  background: 'var(--surface-container-lowest)',
                                  color: 'var(--primary)',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Xem chi tiết
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY CAMPAIGNS */}
        {activeTab === 'campaigns' && (
          <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  Danh sách chiến dịch đã tạo
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  Quản lý nội dung, cập nhật tiến độ giải ngân và báo cáo sao kê
                </p>
              </div>
              <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
                <button
                  type="button"
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--primary-container)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  + Tạo chiến dịch mới
                </button>
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--outline-variant)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Chiến dịch</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Trạng thái</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Tiến độ gây quỹ</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Số người ủng hộ</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {myCampaigns.map((c) => {
                    const prog = getProgress(c.raisedAmount, c.targetAmount);
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <img src={c.thumbnail} alt={c.title} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                            <div>
                              <strong style={{ display: 'block', color: 'var(--on-surface)', marginBottom: 2 }}>{c.title}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Tạo ngày {formatDate(c.createdAt)}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 12, background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                            ✓ Đang mở quỹ
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', minWidth: 160 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                            {formatCurrency(c.raisedAmount)} / {formatCurrency(c.targetAmount)} ({prog}%)
                          </div>
                          <ProgressBar value={prog} height={6} />
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.donorCount} lượt</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Link to={`/campaigns/${c.id}`} style={{ textDecoration: 'none' }}>
                              <button
                                type="button"
                                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: '#fff', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Xem
                              </button>
                            </Link>
                            <button
                              type="button"
                              onClick={() => alert(`Đăng bài cập nhật tiến độ cho chiến dịch: "${c.title}"`)}
                              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--primary-fixed)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              + Đăng cập nhật
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DONATIONS */}
        {activeTab === 'donations' && (
          <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '28px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
              Lịch sử các khoản đóng góp đã thực hiện
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--outline-variant)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Mã giao dịch</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Chiến dịch ủng hộ</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)', textAlign: 'right' }}>Số tiền</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Thời gian</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)' }}>Trạng thái</th>
                    <th style={{ padding: '12px 16px', color: 'var(--on-surface-variant)', textAlign: 'center' }}>Chứng nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDonations.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600 }}>
                        FT-DON-{d.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--on-surface)' }}>
                        {d.campaign.title}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatCurrency(d.amount)}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--on-surface-variant)' }}>
                        {formatDate(d.createdAt)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 8, background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 600 }}>
                          ✓ Thành công
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => alert(`Đang tải chứng nhận đóng góp điện tử mã: FT-DON-${d.id}`)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--outline-variant)',
                            background: 'var(--surface-container-low)',
                            color: 'var(--primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          📜 Tải chứng nhận
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TRANSPARENCY & AUDIT */}
        {activeTab === 'transparency' && (
          <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  Sổ cái sao kê dòng tiền & Đối soát tài khoản ký quỹ
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  Minh bạch tài chính 100% kết nối với cổng ngân hàng đối tác bảo lãnh
                </p>
              </div>
              <button
                type="button"
                onClick={() => alert('Xuất tệp sao kê toàn bộ chiến dịch (Excel)...')}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-low)',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                📥 Xuất sổ cái sao kê (Excel)
              </button>
            </div>

            <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)', marginBottom: 24, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Tổng thu quỹ nhận vào</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {formatCurrency(totalRaised)}
                </div>
              </div>
              <div style={{ width: 1, background: 'var(--outline-variant)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Tổng đã giải ngân đợt 1 & 2</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>
                  {formatCurrency(340000000)}
                </div>
              </div>
              <div style={{ width: 1, background: 'var(--outline-variant)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Số dư đang bảo lãnh ký quỹ</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                  {formatCurrency(totalRaised - 340000000)}
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--outline-variant)' }}>
                  <th style={{ padding: '10px 14px', color: 'var(--on-surface-variant)' }}>Mã giải ngân</th>
                  <th style={{ padding: '10px 14px', color: 'var(--on-surface-variant)' }}>Chiến dịch</th>
                  <th style={{ padding: '10px 14px', color: 'var(--on-surface-variant)' }}>Mục đích chi</th>
                  <th style={{ padding: '10px 14px', color: 'var(--on-surface-variant)', textAlign: 'right' }}>Số tiền</th>
                  <th style={{ padding: '10px 14px', color: 'var(--on-surface-variant)' }}>Tình trạng hóa đơn</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 'DSB-HG-01', name: 'Xây trường học Hà Giang', desc: 'Mua 50 tấn xi măng & gạch nung', amount: 150000000, status: '✓ Đã nghiệm thu hóa đơn đỏ' },
                  { code: 'DSB-MT-01', name: 'Hỗ trợ bệnh nhân ung thư', desc: 'Thanh toán viện phí đợt 1 BV K', amount: 190000000, status: '✓ Biên lai bệnh viện đã đối soát' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{row.code}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: '12px 14px' }}>{row.desc}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      -{formatCurrency(row.amount)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#059669', fontWeight: 600 }}>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
