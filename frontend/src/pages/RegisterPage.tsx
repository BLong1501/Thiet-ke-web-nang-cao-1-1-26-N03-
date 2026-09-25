import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const STEPS = [
  { label: 'Tài khoản', icon: '👤' },
  { label: 'Bảo mật', icon: '🔒' },
  { label: 'Hoàn tất', icon: '🎉' },
];

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { setUser, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Đăng ký - FundVN';
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.length < 2) e.name = 'Tên phải có ít nhất 2 ký tự';
    if (!email.includes('@')) e.email = 'Email không hợp lệ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (password.length < 8) e.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    if (password !== confirmPwd) e.confirmPwd = 'Mật khẩu xác nhận không khớp';
    if (!agreed) e.agreed = 'Vui lòng đồng ý với điều khoản';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setUser({
      id: Date.now().toString(),
      name, email,
      role: 'user', isVerified: false,
      joinedAt: new Date().toISOString(),
    }, 'new-user-token');
    setStep(3);
    setIsLoading(false);
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', padding: '12px 16px',
    background: focusedField === field ? 'rgba(124,58,237,0.08)' : 'rgba(18,18,42,0.8)',
    border: `1.5px solid ${errors[field] ? 'rgba(239,68,68,0.5)' : focusedField === field ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
    fontFamily: 'var(--font-body)', boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a14, #1a0a2e)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '24px',
    }}>
      <div style={{
        position: 'absolute', top: '-10%', right: '-5%',
        width: 400, height: 400,
        background: 'rgba(124,58,237,0.1)', borderRadius: '50%', filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(15,15,26,0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 'var(--radius-2xl)',
        padding: '40px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
        animation: 'scaleIn 0.3s ease forwards',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>💚</div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', background: 'linear-gradient(135deg, #a78bfa, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>FundVN</span>
          </Link>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 32, position: 'relative' }}>
          {STEPS.map((s, i) => {
            const isActive = step === i + 1;
            const isDone = step > i + 1;
            return (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: isDone ? 'var(--emerald-500)' : isActive ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${isDone ? 'var(--emerald-500)' : isActive ? 'var(--primary-500)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem',
                    boxShadow: isActive ? '0 4px 16px rgba(124,58,237,0.4)' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    {isDone ? '✓' : s.icon}
                  </div>
                  <div style={{ fontSize: '0.7rem', marginTop: 6, color: isActive ? 'var(--primary-400)' : 'var(--text-disabled)', fontWeight: isActive ? 700 : 400 }}>
                    {s.label}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginTop: 22, alignSelf: 'flex-start',
                    background: step > i + 1 ? 'var(--emerald-500)' : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s ease',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {step === 1 && (
          <>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 6, textAlign: 'center' }}>Tạo tài khoản</h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem', marginBottom: 24 }}>
              Đã có tài khoản?{' '}
              <Link to="/login" style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}>Đăng nhập</Link>
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Họ và tên</label>
              <input
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Nguyễn Văn An"
                style={inputStyle('name')}
              />
              {errors.name && <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: 4 }}>⚠️ {errors.name}</div>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="email@example.com"
                style={inputStyle('email')}
              />
              {errors.email && <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: 4 }}>⚠️ {errors.email}</div>}
            </div>

            <button onClick={handleNext} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: '#fff', cursor: 'pointer',
              fontSize: '1rem', fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              boxShadow: '0 6px 24px rgba(124,58,237,0.4)',
            }}>
              Tiếp tục →
            </button>
          </>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 24, textAlign: 'center' }}>Thiết lập mật khẩu</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Mật khẩu</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Tối thiểu 8 ký tự"
                style={inputStyle('password')}
              />
              {errors.password && <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: 4 }}>⚠️ {errors.password}</div>}

              {/* Password strength */}
              {password && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: password.length >= i * 2
                        ? i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#10b981' : '#7c3aed'
                        : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Xác nhận mật khẩu</label>
              <input
                type="password" value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                onFocus={() => setFocusedField('confirmPwd')}
                onBlur={() => setFocusedField(null)}
                placeholder="Nhập lại mật khẩu"
                style={inputStyle('confirmPwd')}
              />
              {errors.confirmPwd && <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: 4 }}>⚠️ {errors.confirmPwd}</div>}
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 24 }}>
              <input
                type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--primary-500)' }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Tôi đồng ý với{' '}
                <a href="#" style={{ color: 'var(--primary-400)', textDecoration: 'none' }}>Điều khoản sử dụng</a>
                {' '}và{' '}
                <a href="#" style={{ color: 'var(--primary-400)', textDecoration: 'none' }}>Chính sách bảo mật</a>
              </span>
            </label>
            {errors.agreed && <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: -16, marginBottom: 12 }}>⚠️ {errors.agreed}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep(1)} style={{
                flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem',
                fontFamily: 'var(--font-body)',
              }}>← Quay lại</button>
              <button type="submit" disabled={isLoading} style={{
                flex: 2, padding: '14px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '1rem', fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                boxShadow: '0 6px 24px rgba(124,58,237,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {isLoading ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Đang tạo...
                  </>
                ) : '🎉 Đăng ký'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '5rem', marginBottom: 20, animation: 'float 2s ease-in-out infinite' }}>🎉</div>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 12, color: 'var(--emerald-400)' }}>
              Chào mừng đến với FundVN!
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.9rem' }}>
              Tài khoản của <strong style={{ color: 'var(--text-primary)' }}>{name}</strong> đã được tạo thành công.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.85rem' }}>
              Kiểm tra email <strong style={{ color: 'var(--primary-400)' }}>{email}</strong> để xác minh tài khoản.
            </p>
            <button onClick={() => navigate('/dashboard')} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: '#fff', cursor: 'pointer',
              fontSize: '1rem', fontWeight: 700,
              fontFamily: 'var(--font-heading)',
            }}>
              Đến Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
