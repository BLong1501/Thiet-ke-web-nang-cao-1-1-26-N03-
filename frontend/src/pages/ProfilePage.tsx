import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { mockDonations } from '../data/mockData';
import { formatCurrency, formatDate } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'info' | 'kyc' | 'history' | 'security'>('info');

  // Form states
  const [name, setName] = useState(user?.name || 'Nguyễn Văn An');
  const [email] = useState(user?.email || 'an@example.com');
  const [phone, setPhone] = useState('0912 345 678');
  const [bio, setBio] = useState(user?.bio || 'Tình nguyện viên tích cực vì trẻ em vùng cao.');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // KYC States
  const [cccdNumber, setCccdNumber] = useState('001099012345');
  const [fullName, setFullName] = useState(user?.name || 'Nguyễn Văn An');
  const [orgName, setOrgName] = useState('Nhóm Thiện Nguyện Cầu Vồng');
  const [kycSubmitted, setKycSubmitted] = useState(user?.isVerified || false);
  const [kycSuccessMsg, setKycSuccessMsg] = useState(false);

  const myDonations = mockDonations.slice(0, 4);

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      setUser({ ...user, name, bio });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKycSubmitted(true);
    setKycSuccessMsg(true);
    if (user) {
      setUser({ ...user, isVerified: true });
    }
    setTimeout(() => setKycSuccessMsg(false), 4000);
  };

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--background)', padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: 960 }}>
        {/* User Card Top Banner */}
        <div
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 32,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <img
              src={user?.avatar || 'https://i.pravatar.cc/150?img=1'}
              alt={user?.name}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-fixed)' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--on-surface)' }}>
                  {user?.name || 'Nguyễn Văn An'}
                </h2>
                {user?.isVerified && (
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 12,
                    }}
                  >
                    ✓ Đã xác minh KYC
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                {user?.email || 'an@example.com'} • Gia nhập {user?.joinedAt || '15/01/2024'}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  background: 'var(--primary-fixed)',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                }}
              >
                {user?.role === 'admin' ? '🛡️ Quản trị viên' : user?.role === 'fundraiser' ? '🎯 Người gây quỹ' : '👤 Nhà hảo tâm'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                {formatCurrency(user?.totalRaised || 150000000)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Tổng quỹ đã vận động</div>
            </div>
            <div style={{ width: 1, background: 'var(--outline-variant)' }} />
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                {formatCurrency(user?.totalDonated || 5000000)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Đã đóng góp ủng hộ</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 24,
            borderBottom: '1px solid var(--outline-variant)',
            paddingBottom: 4,
          }}
        >
          {[
            { id: 'info', label: '👤 Thông tin cá nhân' },
            { id: 'kyc', label: '🛡️ Xác minh danh tính KYC' },
            { id: 'history', label: '❤️ Lịch sử ủng hộ & Huy hiệu' },
            { id: 'security', label: '🔒 Bảo mật & Mật khẩu' },
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

        {/* TAB 1: Profile Info */}
        {activeTab === 'info' && (
          <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '32px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
              Chỉnh sửa thông tin tài khoản
            </h3>

            {savedSuccess && (
              <div style={{ padding: '12px 16px', background: '#ecfdf5', color: '#065f46', borderRadius: 8, fontSize: '0.875rem', marginBottom: 20 }}>
                ✓ Đã cập nhật thông tin thành công!
              </div>
            )}

            <form onSubmit={handleSaveInfo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)', fontSize: '0.9375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                    Email đăng ký
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', fontSize: '0.9375rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                  Số điện thoại liên hệ
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)', fontSize: '0.9375rem' }}
                />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                  Tiểu sử / Giới thiệu bản thân
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)', fontSize: '0.9375rem', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--primary-container)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                }}
              >
                Lưu thay đổi
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: KYC Verification */}
        {activeTab === 'kyc' && (
          <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  Xác minh danh tính nhà gây quỹ (KYC Level 2)
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  Yêu cầu bắt buộc đối với người khởi tạo chiến dịch nhận tiền giải ngân
                </p>
              </div>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: kycSubmitted ? '#ecfdf5' : '#fef3c7',
                  color: kycSubmitted ? '#065f46' : '#92400e',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                }}
              >
                {kycSubmitted ? '✓ Hồ sơ đã được duyệt' : '⚠️ Cần xác minh'}
              </span>
            </div>

            {kycSuccessMsg && (
              <div style={{ padding: '12px 16px', background: '#ecfdf5', color: '#065f46', borderRadius: 8, fontSize: '0.875rem', marginBottom: 20 }}>
                ✓ Hồ sơ KYC của bạn đã được tiếp nhận và xác thực thành công!
              </div>
            )}

            <form onSubmit={handleKycSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                    Họ và tên trên CCCD/VNeID <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                    Số Căn cước công dân (12 số) <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={cccdNumber}
                    onChange={(e) => setCccdNumber(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                  Tổ chức / Nhóm tình nguyện đại diện (Nếu có)
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)' }}
                />
              </div>

              {/* Document upload previews */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 10 }}>
                  Tài liệu đính kèm (Ảnh CCCD 2 mặt & Giấy phép/Ủy quyền)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {[
                    { label: 'CCCD Mặt trước', icon: '🪪' },
                    { label: 'CCCD Mặt sau', icon: '💳' },
                    { label: 'Giấy chứng nhận cơ sở', icon: '📜' },
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '24px 16px',
                        borderRadius: 12,
                        border: '2px dashed var(--outline-variant)',
                        textAlign: 'center',
                        background: 'var(--surface-container-low)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{doc.icon}</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>{doc.label}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, display: 'inline-block' }}>
                        ✓ Đã đính kèm tệp
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--primary-container)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                }}
              >
                Gửi thẩm định lại hồ sơ
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: History & Badges */}
        {activeTab === 'history' && (
          <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '32px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
              Huy hiệu vinh danh nhà hảo tâm
            </h3>

            {/* Badges row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
              {[
                { icon: '🥇', name: 'Đại sứ Trái tim Vàng', desc: 'Đã đóng góp hỗ trợ hơn 5 dự án cứu trợ', date: '2024' },
                { icon: '🚀', name: 'Nhà kiến tạo tương lai', desc: 'Ủng hộ quỹ xây trường học vùng cao', date: '2024' },
                { icon: '🛡️', name: 'Minh bạch tiêu biểu', desc: 'Hoàn thành sao kê 100% đúng hạn', date: '2024' },
              ].map((badge, i) => (
                <div key={i} style={{ padding: '20px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{badge.icon}</div>
                  <strong style={{ display: 'block', fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: 4 }}>
                    {badge.name}
                  </strong>
                  <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                    {badge.desc}
                  </p>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--primary)', background: 'var(--primary-fixed)', padding: '2px 8px', borderRadius: 8 }}>
                    Cấp năm {badge.date}
                  </span>
                </div>
              ))}
            </div>

            {/* Donation records */}
            <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: 'var(--on-surface)' }}>
              Các khoản đóng góp gần đây
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myDonations.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--surface-container-low)', borderRadius: 10, border: '1px solid var(--outline-variant)' }}>
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--on-surface)', display: 'block' }}>
                      {d.campaign.title}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      Ngày: {formatDate(d.createdAt)} • Mã biên lai: FT-{d.id}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '0.9375rem', color: 'var(--primary)' }}>
                      {formatCurrency(d.amount)}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#059669' }}>✓ Thành công</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Security */}
        {activeTab === 'security' && (
          <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '32px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
              Cài đặt bảo mật & Đổi mật khẩu
            </h3>

            <div style={{ maxWidth: 440 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--outline-variant)' }}
                />
              </div>

              <button
                type="button"
                onClick={() => alert('Đã cập nhật mật khẩu thành công!')}
                style={{
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--primary-container)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                }}
              >
                Cập nhật mật khẩu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
