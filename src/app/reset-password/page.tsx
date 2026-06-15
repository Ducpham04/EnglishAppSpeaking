'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mic } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Đang tải...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể đặt lại mật khẩu');
        return;
      }
      setMessage(data.message || 'Mật khẩu đã được cập nhật.');
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError('Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--primary)', display: 'grid', placeItems: 'center', color: '#FFFFFF' }}>
              <Mic size={21} />
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 850, fontSize: 22, color: 'var(--text-primary)' }}>GB Speaking AI</span>
          </Link>
        </div>
        <main className="glass-card" style={{ padding: 32 }}>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 850, fontSize: 28, color: 'var(--text-primary)', marginBottom: 8 }}>Đặt lại mật khẩu</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>
            Nhập mật khẩu mới cho tài khoản của bạn. Link chỉ dùng được một lần và sẽ hết hạn sau 30 phút.
          </p>

          {!token ? (
            <div style={{ padding: 14, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13, lineHeight: 1.55 }}>
              Link đặt lại mật khẩu không hợp lệ. Vui lòng gửi lại yêu cầu quên mật khẩu.
            </div>
          ) : message ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 14, borderRadius: 8, background: '#ECFDF5', border: '1px solid #BBF7D0', display: 'flex', gap: 10 }}>
                <CheckCircle2 size={18} style={{ color: '#047857', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: '#047857', lineHeight: 1.55 }}>{message}</p>
              </div>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ width: '100%', padding: '13px 16px' }}>Đăng nhập</button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
              <PasswordField label="Mật khẩu mới" value={password} show={showPassword} onChange={setPassword} onToggle={() => setShowPassword(value => !value)} />
              <PasswordField label="Nhập lại mật khẩu mới" value={confirmPassword} show={showPassword} onChange={setConfirmPassword} onToggle={() => setShowPassword(value => !value)} />
              {error ? <p style={{ color: '#DC2626', fontSize: 13 }}>{error}</p> : null}
              <button className="btn-primary" disabled={loading} style={{ width: '100%', padding: '13px 16px' }}>
                {loading ? <Loader2 size={17} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Lock size={17} />}
                Cập nhật mật khẩu
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

function PasswordField({ label, value, show, onChange, onToggle }: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <Lock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          minLength={6}
          required
          style={inputStyle}
        />
        <button type="button" onClick={onToggle} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 42px 12px 40px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: 'var(--text-primary)',
  fontSize: 14,
  boxSizing: 'border-box' as const,
};
