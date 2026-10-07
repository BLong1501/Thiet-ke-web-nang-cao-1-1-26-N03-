import React, { useState } from 'react';
import type { Campaign } from '../../types';
import { formatCurrency, getProgress } from '../../services/api';
import ProgressBar from './ProgressBar';

interface DonationModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

type PaymentMethod = 'vietqr' | 'momo' | 'card';

export const DonationModal: React.FC<DonationModalProps> = ({ campaign, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number | ''>(100000);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vietqr');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);

  const selectedAmount = amount || (customAmount ? parseInt(customAmount.replace(/\D/g, '')) || 0 : 0);

  const transactionCode = `FT${campaign.id.padStart(3, '0')}${Math.floor(10000 + Math.random() * 90000)}`;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsLoading(true);
    // Simulate payment verification
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    setStep(3);
    onSuccess?.(selectedAmount);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(19, 27, 46, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 'var(--z-modal)' as unknown as number,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal Card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: ((('var(--z-modal)' as unknown as number) as number) + 1) || 401,
          width: '92%',
          maxWidth: 540,
          maxHeight: '90vh',
          background: 'var(--surface-container-lowest)',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg), 0 24px 60px rgba(19,27,46,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-low)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1.1rem' }}>💝</span>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                {step === 1 && 'Chọn mức quyên góp'}
                {step === 2 && 'Xác nhận & Chuyển khoản'}
                {step === 3 && 'Quyên góp thành công'}
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {campaign.title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-container-lowest)')}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {/* Progress context */}
          <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--outline-variant)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Đã đạt: <strong>{formatCurrency(campaign.raisedAmount)}</strong></span>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{progress}% mục tiêu</span>
            </div>
            <ProgressBar value={progress} height={6} />
          </div>

          {step === 1 && (
            <>
              {/* Preset amounts */}
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 10 }}>
                Chọn số tiền ủng hộ (VND)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {QUICK_AMOUNTS.map((amt) => {
                  const isSelected = amount === amt && !customAmount;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setAmount(amt);
                        setCustomAmount('');
                      }}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 10,
                        border: `1.5px solid ${isSelected ? 'var(--primary-container)' : 'var(--outline-variant)'}`,
                        background: isSelected ? 'var(--primary-fixed)' : 'var(--surface-container-lowest)',
                        color: isSelected ? 'var(--primary)' : 'var(--on-surface)',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.875rem',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.15)' : 'none',
                      }}
                    >
                      {formatCurrency(amt)}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 6 }}>
                  Hoặc nhập số tiền tùy chọn:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="VD: 350.000"
                    value={customAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCustomAmount(val ? parseInt(val).toLocaleString('vi-VN') : '');
                      setAmount('');
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 48px 11px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--outline-variant)',
                      background: 'var(--surface-container-lowest)',
                      fontSize: '0.9375rem',
                      color: 'var(--on-surface)',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary-container)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
                  />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', fontSize: '0.875rem', fontWeight: 600 }}>
                    ₫
                  </span>
                </div>
              </div>

              {/* Donor Name & Anonymous */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 6 }}>
                  Họ tên người ủng hộ:
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên hiển thị trên bảng vinh danh..."
                  disabled={isAnonymous}
                  value={isAnonymous ? 'Nhà hảo tâm ẩn danh' : donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    background: isAnonymous ? 'var(--surface-container)' : 'var(--surface-container-lowest)',
                    fontSize: '0.9rem',
                    color: 'var(--on-surface)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ width: 17, height: 17, accentColor: 'var(--primary-container)' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--on-surface)', fontWeight: 500 }}>
                    Ủng hộ ẩn danh (Tên và thông tin sẽ không xuất hiện công khai)
                  </span>
                </label>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 6 }}>
                  Lời nhắn động viên (Tùy chọn):
                </label>
                <textarea
                  rows={2}
                  placeholder="Gửi lời chúc, niềm tin yêu đến các hoàn cảnh cần giúp đỡ..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    fontSize: '0.875rem',
                    color: 'var(--on-surface)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                type="button"
                disabled={selectedAmount <= 0}
                onClick={() => setStep(2)}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 10,
                  border: 'none',
                  background: selectedAmount > 0 ? 'var(--primary-container)' : 'var(--surface-container-high)',
                  color: selectedAmount > 0 ? '#fff' : 'var(--outline)',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: selectedAmount > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.18s ease',
                  boxShadow: selectedAmount > 0 ? '0 2px 10px rgba(37,99,235,0.3)' : 'none',
                }}
              >
                Tiếp tục: {formatCurrency(selectedAmount)} →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Amount summary */}
              <div
                style={{
                  padding: '14px 18px',
                  background: 'var(--primary-fixed)',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', display: 'block' }}>Tổng số tiền ủng hộ</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                    {formatCurrency(selectedAmount)}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--primary)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: 'var(--primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Sửa số tiền
                </button>
              </div>

              {/* Payment Method selector */}
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 10 }}>
                Phương thức thanh toán
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {[
                  { id: 'vietqr', label: 'VietQR / Ngân hàng', icon: '🏦' },
                  { id: 'momo', label: 'Ví MoMo', icon: '📱' },
                  { id: 'card', label: 'Thẻ Visa / Master', icon: '💳' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: `1.5px solid ${paymentMethod === m.id ? 'var(--primary-container)' : 'var(--outline-variant)'}`,
                      background: paymentMethod === m.id ? 'var(--surface-container-low)' : 'var(--surface-container-lowest)',
                      color: paymentMethod === m.id ? 'var(--primary)' : 'var(--on-surface)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* VietQR instructions */}
              {paymentMethod === 'vietqr' && (
                <div
                  style={{
                    background: 'var(--surface-container-low)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 14,
                    padding: '18px',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Simulated QR Code */}
                    <div
                      style={{
                        width: 140,
                        height: 140,
                        background: '#ffffff',
                        padding: 8,
                        borderRadius: 10,
                        border: '1px solid var(--outline-variant)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=2|99|0901234567|FUNDTRUST|${transactionCode}|${selectedAmount}`}
                        alt="Mã VietQR"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Bank Transfer info */}
                    <div style={{ flex: 1, minWidth: 200, fontSize: '0.8125rem' }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>Ngân hàng: </span>
                        <strong>MB Bank (Quân Đội)</strong>
                      </div>
                      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>
                          STK: <strong>0339 888 999</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy('0339888999', 'stk')}
                          style={{
                            background: 'var(--surface-container-high)',
                            border: 'none',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            fontWeight: 600,
                          }}
                        >
                          {copiedField === 'stk' ? '✓ Đã chép' : 'Sao chép'}
                        </button>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>Chủ TK: </span>
                        <strong>QUY FUNDTRUST VN</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>
                          Nội dung: <strong style={{ color: 'var(--primary)' }}>{transactionCode}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(transactionCode, 'code')}
                          style={{
                            background: 'var(--surface-container-high)',
                            border: 'none',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            fontWeight: 600,
                          }}
                        >
                          {copiedField === 'code' ? '✓ Đã chép' : 'Sao chép'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--on-surface-variant)', background: 'var(--surface-container)', padding: '6px 10px', borderRadius: 6 }}>
                    ℹ️ Hệ thống tự động ghi nhận trong vòng 30s sau khi chuyển khoản thành công.
                  </div>
                </div>
              )}

              {paymentMethod === 'momo' && (
                <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--surface-container-low)', borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📱</div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                    Bấm xác nhận để mở ứng dụng Ví MoMo thanh toán <strong>{formatCurrency(selectedAmount)}</strong>.
                  </p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 4, color: 'var(--on-surface-variant)' }}>Số thẻ</label>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      defaultValue="9704 1988 2345 6789"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 4, color: 'var(--on-surface-variant)' }}>Hết hạn</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        defaultValue="12/28"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 4, color: 'var(--on-surface-variant)' }}>CVV / CVC</label>
                      <input
                        type="password"
                        placeholder="***"
                        defaultValue="123"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--on-surface)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleConfirmPayment}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--primary-container)',
                    color: '#fff',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {isLoading ? 'Đang xác nhận giao dịch...' : '✓ Tôi đã chuyển khoản'}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 68, height: 68, background: '#ecfdf5', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>
                🎉
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Quyên góp thành công!
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                Chân thành cảm ơn bạn đã ủng hộ <strong>{formatCurrency(selectedAmount)}</strong> cho chiến dịch.
                Mỗi đóng góp đều minh bạch và tạo nên sự khác biệt ý nghĩa!
              </p>

              {/* Receipt Preview */}
              <div style={{ background: 'var(--surface-container-low)', border: '1px dashed var(--outline-variant)', borderRadius: 12, padding: '16px', textAlign: 'left', marginBottom: 24, fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Mã biên lai:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{transactionCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Người ủng hộ:</span>
                  <strong>{isAnonymous ? 'Nhà hảo tâm ẩn danh' : donorName || 'Nhà hảo tâm'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Thời gian:</span>
                  <span>{new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Trạng thái:</span>
                  <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>✓ Đã ghi sổ quỹ minh bạch</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--primary-container)',
                  color: '#fff',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
                }}
              >
                Hoàn tất & Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DonationModal;
