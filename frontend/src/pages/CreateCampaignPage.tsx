import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CATEGORY_LABELS, CATEGORY_ICONS, type CampaignCategory } from '../types';
import { formatCurrency } from '../services/api';
import { mockCampaigns } from '../data/mockData';

const SAMPLE_THUMBNAILS = [
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80',
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb7?w=800&q=80',
];

export const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CampaignCategory>('y-te');
  const [shortDesc, setShortDesc] = useState('');
  const [thumbnail, setThumbnail] = useState(SAMPLE_THUMBNAILS[0]);
  const [customThumbnail, setCustomThumbnail] = useState('');

  const [targetAmount, setTargetAmount] = useState<number>(100000000);
  const [targetAmountStr, setTargetAmountStr] = useState('100.000.000');
  const [deadline, setDeadline] = useState('2026-12-31');
  const [beneficiary, setBeneficiary] = useState('');
  const [bankName, setBankName] = useState('MB Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState([
    { title: 'Giai đoạn 1: Tiếp nhận & mua sắm vật tư ban đầu', percentage: 50 },
    { title: 'Giai đoạn 2: Triển khai hoàn thiện & nghiệm thu thực địa', percentage: 50 },
  ]);

  const [agreeTerms, setAgreeTerms] = useState(false);

  // If not logged in, prompt or allow preview
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const num = parseInt(val) || 0;
    setTargetAmount(num);
    setTargetAmountStr(num ? num.toLocaleString('vi-VN') : '');
  };

  const finalThumbnail = customThumbnail || thumbnail;

  const handleSubmit = async () => {
    if (!agreeTerms) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));

    // Create new campaign object into mock state
    const newCamp = {
      id: String(mockCampaigns.length + 1),
      title,
      category,
      shortDesc,
      description,
      targetAmount,
      raisedAmount: 0,
      donorCount: 0,
      deadline,
      status: 'active' as const,
      creator: user || {
        id: '1',
        name: 'Nguyễn Văn An',
        email: 'an@example.com',
        avatar: 'https://i.pravatar.cc/150?img=1',
        role: 'fundraiser',
        isVerified: true,
        joinedAt: '2024-01-15',
      },
      thumbnail: finalThumbnail,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      tags: [category, 'cộng đồng'],
    };

    mockCampaigns.unshift(newCamp as any);
    setIsSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="page-enter" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: 540, width: '100%', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '40px 32px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--on-surface)', marginBottom: 10 }}>
            Chiến dịch đã được khởi tạo thành công!
          </h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 28 }}>
            Chiến dịch <strong>"{title}"</strong> đã sẵn sàng tiếp nhận sự chung tay của cộng đồng với cam kết minh bạch sao kê 100%.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/campaigns/1')}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--primary-container)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: 'pointer',
              }}
            >
              Xem trang chiến dịch vừa tạo
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '12px 20px',
                borderRadius: 10,
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container-lowest)',
                color: 'var(--on-surface)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: 'pointer',
              }}
            >
              Về Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--background)', padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: 880 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--primary-fixed)', borderRadius: 20, color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 12 }}>
            <span>🚀</span> Khởi tạo chiến dịch cộng đồng
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.025em', margin: '0 0 10px' }}>
            Tạo chiến dịch gây quỹ mới
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', margin: 0 }}>
            Điền các thông tin cần thiết để khởi chạy chiến dịch minh bạch, đáng tin cậy.
          </p>
        </div>

        {/* Wizard Steps Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '16px 24px', marginBottom: 32 }}>
          {[
            { num: 1, label: 'Thông tin cơ bản' },
            { num: 2, label: 'Mục tiêu & Kế hoạch' },
            { num: 3, label: 'Câu chuyện chi tiết' },
            { num: 4, label: 'Xem trước & Gửi' },
          ].map((s, idx) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <React.Fragment key={s.num}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setStep(s.num as any)}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isActive ? 'var(--primary-container)' : isCompleted ? '#059669' : 'var(--surface-container)',
                      color: isActive || isCompleted ? '#fff' : 'var(--on-surface-variant)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isCompleted ? '✓' : s.num}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--primary)' : 'var(--on-surface)' }}>
                    {s.label}
                  </span>
                </div>
                {idx < 3 && <div style={{ flex: 1, height: 1, background: 'var(--outline-variant)', margin: '0 12px' }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card Body */}
        <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', padding: '36px', boxShadow: 'var(--shadow-sm)' }}>
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', marginTop: 0, marginBottom: 20 }}>
                1. Thông tin chung về chiến dịch
              </h3>

              {/* Title */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
                  Tên chiến dịch gây quỹ <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Xây điểm trường mầm non bản Lũng Cú, Hà Giang"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
                  Danh mục cứu trợ / tài trợ <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CampaignCategory)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {CATEGORY_ICONS[key as CampaignCategory]} {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Short Desc */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
                  Mô tả ngắn gọn (Tóm tắt lời kêu gọi, hiển thị trên thẻ) <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={180}
                  placeholder="Tóm tắt hoàn cảnh và mục đích gây quỹ trong 1-2 câu ngắn gọn..."
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: 4 }}>
                  {shortDesc.length}/180 ký tự
                </div>
              </div>

              {/* Thumbnail Selection */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 10 }}>
                  Ảnh bìa chiến dịch
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
                  {SAMPLE_THUMBNAILS.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setThumbnail(img);
                        setCustomThumbnail('');
                      }}
                      style={{
                        height: 72,
                        borderRadius: 8,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: `2.5px solid ${thumbnail === img && !customThumbnail ? 'var(--primary-container)' : 'transparent'}`,
                        opacity: thumbnail === img && !customThumbnail ? 1 : 0.7,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img src={img} alt="thumbnail sample" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Hoặc dán URL ảnh bìa tùy chỉnh (https://...)"
                  value={customThumbnail}
                  onChange={(e) => setCustomThumbnail(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              {/* Next button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={!title.trim() || !shortDesc.trim()}
                  onClick={() => setStep(2)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 10,
                    border: 'none',
                    background: title.trim() && shortDesc.trim() ? 'var(--primary-container)' : 'var(--surface-container-high)',
                    color: title.trim() && shortDesc.trim() ? '#fff' : 'var(--outline)',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    cursor: title.trim() && shortDesc.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Tiếp tục: Bước 2 →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Goal & Banking Info */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', marginTop: 0, marginBottom: 20 }}>
                2. Mục tiêu tài chính & Tài khoản tiếp nhận
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
                    Số tiền mục tiêu cần gây quỹ (VND) <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={targetAmountStr}
                    onChange={handleAmountChange}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--outline-variant)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                    }}
                  />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: 4 }}>
                    = {formatCurrency(targetAmount)}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
                    Ngày kết thúc chiến dịch <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--outline-variant)',
                      fontSize: '0.9375rem',
                    }}
                  />
                </div>
              </div>

              {/* Beneficiary */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
                  Đối tượng thụ hưởng trực tiếp
                </label>
                <input
                  type="text"
                  placeholder="VD: 45 em học sinh mầm non và thầy cô tại điểm trường bản Lũng Cú"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    fontSize: '0.9375rem',
                  }}
                />
              </div>

              {/* Escrow Bank Account */}
              <div style={{ padding: '20px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)', marginBottom: 28 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  🏦 Tài khoản tiếp nhận giải ngân (Phục vụ đối soát sao kê)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>Ngân hàng</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)' }}
                    >
                      <option value="MB Bank">MB Bank (Quân Đội)</option>
                      <option value="Vietcombank">Vietcombank</option>
                      <option value="BIDV">BIDV</option>
                      <option value="Techcombank">Techcombank</option>
                      <option value="Agribank">Agribank</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>Số tài khoản</label>
                    <input
                      type="text"
                      placeholder="0123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>Tên chủ tài khoản</label>
                    <input
                      type="text"
                      placeholder="NGUYEN VAN A"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--on-surface)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  disabled={targetAmount <= 0}
                  onClick={() => setStep(3)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--primary-container)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Tiếp tục: Bước 3 →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Detailed Story & Milestones */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', marginTop: 0, marginBottom: 20 }}>
                3. Chi tiết câu chuyện & Các mốc giải ngân
              </h3>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
                  Nội dung chi tiết hoàn cảnh và lời kêu gọi <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <textarea
                  rows={8}
                  placeholder="Kể chi tiết câu chuyện hoàn cảnh, khó khăn hiện tại, giải pháp thực hiện, và lý do bạn cần sự chung tay của cộng đồng..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Milestones plan */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
                  Kế hoạch giải ngân theo tiến độ (Milestones)
                </label>
                {milestones.map((ms, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                    <input
                      type="text"
                      value={ms.title}
                      onChange={(e) => {
                        const copy = [...milestones];
                        copy[i].title = e.target.value;
                        setMilestones(copy);
                      }}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)' }}
                    />
                    <div style={{ width: 90, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        value={ms.percentage}
                        onChange={(e) => {
                          const copy = [...milestones];
                          copy[i].percentage = parseInt(e.target.value) || 0;
                          setMilestones(copy);
                        }}
                        style={{ width: 60, padding: '10px 8px', borderRadius: 8, border: '1px solid var(--outline-variant)', textAlign: 'center' }}
                      />
                      <span>%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--on-surface)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  disabled={!description.trim()}
                  onClick={() => setStep(4)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 10,
                    border: 'none',
                    background: description.trim() ? 'var(--primary-container)' : 'var(--surface-container-high)',
                    color: description.trim() ? '#fff' : 'var(--outline)',
                    fontWeight: 600,
                    cursor: description.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Xem trước & Xác nhận →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Preview & Commitment */}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', marginTop: 0, marginBottom: 20 }}>
                4. Xem trước chiến dịch & Cam kết minh bạch
              </h3>

              {/* Live Preview Card */}
              <div style={{ padding: '20px', background: 'var(--surface-container-low)', borderRadius: 14, border: '1px solid var(--outline-variant)', marginBottom: 24 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                  👁️ Xem trước giao diện hiển thị:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'center' }}>
                  <img
                    src={finalThumbnail}
                    alt={title}
                    style={{ width: '100%', height: 160, borderRadius: 10, objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ display: 'inline-block', padding: '2px 8px', background: 'var(--primary-fixed)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 6 }}>
                      {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]}
                    </div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '1.125rem', color: 'var(--on-surface)' }}>
                      {title || 'Tên chiến dịch'}
                    </h4>
                    <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                      {shortDesc || 'Mô tả ngắn gọn...'}
                    </p>
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>
                      Mục tiêu gây quỹ: {formatCurrency(targetAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Commitment Checkbox */}
              <div style={{ padding: '18px', background: '#ecfdf5', borderRadius: 12, border: '1px solid #a7f3d0', marginBottom: 28 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: '#059669' }}
                  />
                  <div style={{ fontSize: '0.875rem', color: '#065f46', lineHeight: 1.5 }}>
                    <strong>Tôi cam kết tính xác thực 100% của thông tin chiến dịch:</strong> Toàn bộ số tiền quyên góp sẽ được sử dụng đúng mục đích; tôi đồng ý thực hiện sao kê định kỳ kèm hóa đơn, chứng từ hợp lệ trên nền tảng FundTrust và chịu trách nhiệm trước pháp luật.
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--on-surface)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  disabled={!agreeTerms || isSubmitting}
                  onClick={handleSubmit}
                  style={{
                    padding: '14px 36px',
                    borderRadius: 10,
                    border: 'none',
                    background: agreeTerms ? 'var(--primary-container)' : 'var(--surface-container-high)',
                    color: agreeTerms ? '#fff' : 'var(--outline)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: agreeTerms && !isSubmitting ? 'pointer' : 'not-allowed',
                    boxShadow: agreeTerms ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                  }}
                >
                  {isSubmitting ? 'Đang khởi tạo...' : '🚀 Khởi chạy chiến dịch ngay'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignPage;
