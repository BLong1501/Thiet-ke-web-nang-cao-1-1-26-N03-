import React, { useState } from 'react';
import type { Campaign } from '../../types';
import { formatCurrency, getProgress } from '../../services/api';
import Button from './Button';
import ProgressBar from './ProgressBar';

interface DonationModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

export const DonationModal: React.FC<DonationModalProps> = ({ campaign, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number | ''>('');
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);

  const selectedAmount = amount || (customAmount ? parseInt(customAmount.replace(/\D/g, '')) : 0);

  const handleSubmit = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate API
    setIsLoading(false);
    setStep(3);
    onSuccess?.(selectedAmount as number);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 400,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 401,
        width: '90%',
        maxWidth: 520,
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(124,58,237,0.15)',
        animation: 'scaleIn 0.3s ease forwards',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.1))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>
              💝 Quyên góp cho chiến dịch
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {campaign.title.length > 50 ? campaign.title.substring(0, 50) + '...' : campaign.title}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px 10px',
            fontSize: '1rem',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tiến độ: {progress}%</span>
              <span style={{ color: 'var(--primary-400)', fontWeight: 700 }}>{formatCurrency(campaign.raisedAmount)}</span>
            </div>
            <ProgressBar value={progress} height={6} />
          </div>

          {step === 1 && (
            <>
              <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: 14, fontSize: '1rem' }}>
                Chọn số tiền quyên góp
              </h4>
              {/* Quick amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }} style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${amount === a ? 'var(--primary-500)' : 'rgba(255,255,255,0.1)'}`,
                    background: amount === a ? 'rgba(124,58,237,0.2)' : 'rgba(26,26,46,0.6)',
                    color: amount === a ? 'var(--primary-400)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.82rem',
                    fontWeight: amount === a ? 700 : 400,
                    transition: 'all 0.2s ease',
                  }}>
                    {formatCurrency(a)}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Hoặc nhập số tiền khác:
                </label>
                <input
                  type="text"
                  placeholder="VD: 300.000"
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setAmount(''); }}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'rgba(18,18,42,0.8)',
                    border: `1px solid ${customAmount ? 'var(--primary-500)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem', outline: 'none',
                    fontFamily: 'var(--font-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Anonymous */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary-500)' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Quyên góp ẩn danh
                </span>
              </label>

              <Button
                fullWidth
                size="lg"
                disabled={!selectedAmount}
                onClick={() => setStep(2)}
              >
                Tiếp tục →
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ marginBottom: 20, padding: '14px', background: 'rgba(124,58,237,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>Số tiền quyên góp</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', background: 'linear-gradient(135deg, #a78bfa, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {formatCurrency(selectedAmount as number)}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Lời nhắn (tùy chọn):
                </label>
                <textarea
                  placeholder="Để lại lời chúc hoặc thông điệp của bạn..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'rgba(18,18,42,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem', outline: 'none',
                    fontFamily: 'var(--font-body)',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="outline" onClick={() => setStep(1)} style={{ flex: 1 }}>
                  ← Quay lại
                </Button>
                <Button fullWidth onClick={handleSubmit} isLoading={isLoading} style={{ flex: 2 }}>
                  {isLoading ? 'Đang xử lý...' : '💳 Thanh toán ngay'}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>🎉</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--emerald-400)', marginBottom: 8 }}>
                Quyên góp thành công!
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>
                Cảm ơn bạn đã đóng góp <strong style={{ color: 'var(--primary-400)' }}>{formatCurrency(selectedAmount as number)}</strong> cho chiến dịch này. Sự hỗ trợ của bạn có ý nghĩa rất lớn! ❤️
              </p>
              <Button fullWidth variant="success" onClick={onClose}>
                Đóng
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DonationModal;
