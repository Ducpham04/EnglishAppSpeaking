'use client';

import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Wand2 } from 'lucide-react';

function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const symbols = '!@#$%';
  let password = 'Gb';
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  password += symbols[Math.floor(Math.random() * symbols.length)];
  return password;
}

export default function AdminPasswordResetForm({ userId }: { userId: string }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const nextPassword = password.trim();
    if (nextPassword.length < 6) {
      setError('Tối thiểu 6 ký tự');
      setMessage('');
      return;
    }

    const confirmed = window.confirm('Đặt mật khẩu mới cho tài khoản này? Người dùng sẽ cần dùng mật khẩu mới để đăng nhập.');
    if (!confirmed) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nextPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể đổi mật khẩu');
        return;
      }
      setMessage('Đã đổi. Hãy gửi mật khẩu mới cho user.');
    } catch {
      setError('Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const generate = () => {
    const nextPassword = generateTemporaryPassword();
    setPassword(nextPassword);
    setShowPassword(true);
    setError('');
    setMessage('');
  };

  return (
    <div className="admin-password-form" style={{ display: 'grid', gap: 7, width: 230 }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        Không xem được mật khẩu cũ, chỉ đặt mật khẩu mới.
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            value={password}
            onChange={event => {
              setPassword(event.target.value);
              setError('');
              setMessage('');
            }}
            type={showPassword ? 'text' : 'password'}
            placeholder="Mật khẩu mới"
            style={{ ...fieldStyle, paddingRight: 34 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            title={showPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
            style={iconInsideInputStyle}
          >
            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button type="button" onClick={generate} title="Tạo mật khẩu tạm" style={iconButtonStyle}>
          <Wand2 size={13} />
        </button>
      </div>
      <button type="button" disabled={loading || password.trim().length < 6} onClick={submit} style={buttonStyle}>
        {loading ? <Loader2 size={13} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <KeyRound size={13} />}
        Đổi mật khẩu
      </button>
      {message && <p style={{ fontSize: 11, color: '#047857', lineHeight: 1.4 }}>{message}</p>}
      {error && <p style={{ fontSize: 11, color: '#EF4444', lineHeight: 1.4 }}>{error}</p>}
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  padding: '8px 9px',
  borderRadius: 7,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: 'var(--text-primary)',
  fontSize: 12,
  boxSizing: 'border-box' as const,
};

const iconInsideInputStyle = {
  position: 'absolute' as const,
  top: 4,
  right: 4,
  width: 26,
  height: 26,
  borderRadius: 6,
  border: 0,
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const iconButtonStyle = {
  width: 34,
  borderRadius: 7,
  border: '1px solid #BFDBFE',
  background: '#EFF6FF',
  color: 'var(--primary)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const buttonStyle = {
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid #BFDBFE',
  background: '#EFF6FF',
  color: 'var(--primary)',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};
