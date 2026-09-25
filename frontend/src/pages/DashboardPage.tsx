import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { mockCampaigns, mockDonations } from '../data/mockData';
import { formatCurrency, getProgress, getDaysLeft } from '../services/api';
import ProgressBar from '../components/ui/ProgressBar';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];
const DONATION_TREND = MONTHS.map((m, i) => ({
  month: m,
  received: Math.floor(Math.random() * 50 + 20) * 1000000,
  donors: Math.floor(Math.random() * 80 + 30),
}));

const PIE_DATA = [
  { name: 'Y tế', value: 35, color: '#ef4444' },
  { name: 'Giáo dục', value: 28, color: '#f59e0b' },
  { name: 'Môi trường', value: 18, color: '#10b981' },
  { name: 'Cứu trợ', value: 12, color: '#3b82f6' },
  { name: 'Khác', value: 7, color: '#6b7280' },
];

const QUICK_ACTIONS = [
  { icon: '🚀', label: 'Tạo chiến dịch', to: '/campaigns/create', color: '#7c3aed' },
  { icon: '✅', label: 'Xác minh tài khoản', to: '#', color: '#10b981' },
  { icon: '📣', label: 'Đăng cập nhật', to: '#', color: '#f59e0b' },
  { icon: '📊', label: 'Báo cáo tài chính', to: '#', color: '#06b6d4' },
];

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'donations' | 'analytics'>('overview');

  useEffect(() => { document.title = 'Dashboard - FundVN'; }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const myCampaigns = mockCampaigns.slice(0, 3);
  const recentDonations = mockDonations.slice(0, 5);

  const totalRaised = myCampaigns.reduce((s, c) => s + c.raisedAmount, 0);
  const totalDonors = myCampaigns.reduce((s, c) => s + c.donorCount, 0);

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                👋 Xin chào,
              </div>
              <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: 6, fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
                {user?.name} {user?.isVerified && <span title="Đã xác minh" style={{ fontSize: '0.7em' }}>✅</span>}
              </h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 'var(--radius-full)',
                  background: user?.role === 'admin' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
                  border: `1px solid ${user?.role === 'admin' ? 'rgba(239,68,68,0.3)' : 'rgba(124,58,237,0.3)'}`,
                  fontSize: '0.75rem', fontWeight: 700,
                  color: user?.role === 'admin' ? '#f87171' : 'var(--primary-400)',
                  textTransform: 'uppercase',
                }}>
                  {user?.role === 'admin' ? '🛡️ Admin' : user?.role === 'fundraiser' ? '🎯 Fundraiser' : '👤 User'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Tham gia từ {user?.joinedAt}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  color: '#fff', cursor: 'pointer', fontSize: '0.875rem',
                  fontWeight: 600, fontFamily: 'var(--font-body)',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                }}>
                  + Tạo chiến dịch
                </button>
              </Link>
              <Link to="/profile" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
                  fontFamily: 'var(--font-body)',
                }}>
                  ⚙️ Cài đặt
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { icon: '💰', label: 'Tổng đã gây quỹ', value: formatCurrency(totalRaised), change: '+12%', up: true, color: '#7c3aed' },
            { icon: '👥', label: 'Người ủng hộ', value: totalDonors.toLocaleString('vi-VN'), change: '+28%', up: true, color: '#06b6d4' },
            { icon: '📣', label: 'Chiến dịch hoạt động', value: `${myCampaigns.length}`, change: '0', up: true, color: '#10b981' },
            { icon: '⭐', label: 'Tỉ lệ thành công', value: '78%', change: '+5%', up: true, color: '#f59e0b' },
          ].map(({ icon, label, value, change, up, color }) => (
            <div key={label} style={{
              padding: '20px',
              background: 'rgba(26,26,46,0.6)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 'var(--radius-xl)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 42, height: 42,
                  background: `${color}22`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem',
                }}>
                  {icon}
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: up ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: up ? '#34d399' : '#f87171',
                }}>
                  {up ? '↑' : '↓'} {change}
                </span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 4, color }}>{value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { key: 'overview', label: '📊 Tổng quan' },
            { key: 'campaigns', label: '🎯 Chiến dịch của tôi' },
            { key: 'donations', label: '💰 Quyên góp' },
            { key: 'analytics', label: '📈 Phân tích' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key as typeof activeTab)} style={{
              padding: '12px 18px', background: 'none', border: 'none',
              color: activeTab === key ? 'var(--primary-400)' : 'var(--text-muted)',
              fontWeight: activeTab === key ? 700 : 400, fontSize: '0.875rem',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              borderBottom: `2px solid ${activeTab === key ? 'var(--primary-500)' : 'transparent'}`,
              marginBottom: -1, transition: 'all 0.2s ease', whiteSpace: 'nowrap',
            }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
            {/* Chart */}
            <div style={{
              background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 'var(--radius-xl)', padding: '24px',
            }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 20, fontSize: '1.05rem' }}>
                📈 Tiến độ gây quỹ theo tháng
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={DONATION_TREND}>
                  <defs>
                    <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10 }}
                    formatter={(v: number) => [formatCurrency(v), 'Đã gây quỹ']}
                  />
                  <Area type="monotone" dataKey="received" stroke="#7c3aed" strokeWidth={2} fill="url(#gradReceived)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Quick actions */}
              <div style={{
                background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-xl)', padding: '20px',
              }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: 14, fontSize: '0.95rem' }}>⚡ Thao tác nhanh</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {QUICK_ACTIONS.map(({ icon, label, to, color }) => (
                    <Link key={label} to={to} style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}40`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-disabled)', fontSize: '0.8rem' }}>→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Category pie chart */}
              <div style={{
                background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-xl)', padding: '20px',
              }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: 14, fontSize: '0.95rem' }}>🎯 Theo danh mục</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                      {PIE_DATA.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {PIE_DATA.map(({ name, value, color }) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                      {name} ({value}%)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div>
            {myCampaigns.map(campaign => {
              const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);
              const daysLeft = getDaysLeft(campaign.deadline);
              return (
                <div key={campaign.id} style={{
                  display: 'flex', gap: 16, padding: '18px',
                  background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 'var(--radius-xl)', marginBottom: 14,
                }}>
                  <img src={campaign.thumbnail} alt="" style={{ width: 80, height: 80, borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Link to={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none' }}>
                        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', margin: 0, color: 'var(--text-primary)' }}>
                          {campaign.title}
                        </h4>
                      </Link>
                      <span style={{
                        padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 700,
                        background: campaign.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: campaign.status === 'active' ? '#34d399' : '#fbbf24',
                        border: `1px solid ${campaign.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      }}>
                        {campaign.status === 'active' ? '🟢 Đang hoạt động' : '⏳ Chờ duyệt'}
                      </span>
                    </div>
                    <ProgressBar value={progress} height={5} />
                    <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>💰 <strong style={{ color: 'var(--primary-400)' }}>{formatCurrency(campaign.raisedAmount)}</strong> / {formatCurrency(campaign.targetAmount)}</span>
                      <span>👥 {campaign.donorCount.toLocaleString('vi-VN')} người</span>
                      <span>⏳ {daysLeft} ngày còn lại</span>
                      <span>📊 {progress}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <Link to={`/campaigns/${campaign.id}`}>
                      <button style={{ padding: '7px 14px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--primary-400)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        Xem chi tiết
                      </button>
                    </Link>
                    <button style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-body)' }}>
                      Chỉnh sửa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'donations' && (
          <div style={{ background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', margin: 0 }}>Lịch sử quyên góp gần đây</h3>
              <button style={{ padding: '7px 14px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--primary-400)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-body)' }}>
                Xuất CSV
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Người ủng hộ', 'Chiến dịch', 'Số tiền', 'Trạng thái', 'Ngày'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentDonations.map((d, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                          {d.isAnonymous ? '🎭' : '👤'}
                        </div>
                        <span style={{ fontSize: '0.875rem' }}>{d.isAnonymous ? 'Ẩn danh' : d.donor?.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 200 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.campaign.title}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.9rem' }}>
                      {formatCurrency(d.amount)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 700,
                        background: 'rgba(16,185,129,0.15)', color: '#34d399',
                        border: '1px solid rgba(16,185,129,0.3)',
                      }}>
                        ✓ Thành công
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(d.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 20, fontSize: '1rem' }}>📊 Người ủng hộ theo tháng</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={DONATION_TREND}>
                  <defs>
                    <linearGradient id="gradDonors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 10 }} />
                  <Area type="monotone" dataKey="donors" stroke="#06b6d4" strokeWidth={2} fill="url(#gradDonors)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 20, fontSize: '1rem' }}>🎯 Phân bổ danh mục</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false} fontSize={11}>
                    {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .dash-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-overview { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .dash-stats { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
