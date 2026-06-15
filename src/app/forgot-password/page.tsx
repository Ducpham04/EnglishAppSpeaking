'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, Mic, Send, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      setMessage(data.message || 'Nếu tài khoản tồn tại và có email, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch {
      setError('Không thể gửi yêu cầu lúc này. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Link href="/login" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        <ArrowLeft size={14} /> Quay lại đăng nhập
      </Link>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 850, fontSize: 28, color: 'var(--text-primary)', marginBottom: 8 }}>Quên mật khẩu</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65, marginBottom: 26 }}>
        Nhập email hoặc số điện thoại. Nếu tài khoản có email, hệ thống sẽ gửi link đặt lại mật khẩu.
      </p>

      {message ? (
        <div style={{ padding: 14, borderRadius: 8, background: '#ECFDF5', border: '1px solid #BBF7D0', display: 'flex', gap: 10, marginBottom: 18 }}>
          <CheckCircle2 size={18} style={{ color: '#047857', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#047857', lineHeight: 1.55 }}>{message}</p>
        </div>
      ) : null}
      {error ? <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 14 }}>{error}</p> : null}

      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Email hoặc số điện thoại</span>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={identifier}
              onChange={event => setIdentifier(event.target.value)}
              placeholder="you@example.com hoặc 0912345678"
              required
              style={inputStyle}
            />
          </div>
        </label>
        <button className="btn-primary" disabled={loading} style={{ width: '100%', padding: '13px 16px' }}>
          {loading ? <Loader2 size={17} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Send size={17} />}
          Gửi hướng dẫn
        </button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
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
        <main className="glass-card" style={{ padding: 32 }}>{children}</main>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px 12px 40px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: 'var(--text-primary)',
  fontSize: 14,
  boxSizing: 'border-box' as const,
};
