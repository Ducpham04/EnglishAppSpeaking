'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Mic, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error || result.ok === false) {
        setError('Email hoặc mật khẩu không đúng');
      } else {
        window.location.assign('/auth/redirect');
      }
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'var(--gradient-hero)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 24,
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mic size={22} color="white" />
              </div>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)' }}>
                GB Speaking <span style={{ color: 'var(--primary-light)' }}>AI</span>
              </span>
            </Link>
          </div>

          {/* Card */}
          <div className="glass-card" style={{ padding: '40px 32px' }}>
            <h1 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28,
              color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8,
            }}>
              Đăng nhập
            </h1>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
              Chào mừng bạn quay lại!
            </p>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, color: 'var(--text-primary)', fontSize: 14,
                      outline: 'none', fontFamily: 'Inter, sans-serif',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Mật khẩu
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%', padding: '12px 42px 12px 42px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, color: 'var(--text-primary)', fontSize: 14,
                      outline: 'none', fontFamily: 'Inter, sans-serif',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit-btn"
                type="submit"
                className="btn-primary"
                disabled={isLoading}
                style={{
                  width: '100%', padding: '14px 0', fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin-slow 1s linear infinite' }} />
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>

            {/* Register link */}
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
              Chưa có tài khoản?{' '}
              <Link href="/register" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>
                Đăng ký miễn phí
              </Link>
            </p>

            {/* Test accounts info */}
            <div style={{
              marginTop: 32, padding: '16px 20px',
              background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: 12,
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10 }}>
                🧪 Tài khoản test:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { role: 'Admin', email: 'admin@gbspeaking.com', color: '#EF4444' },
                  { role: 'Teacher', email: 'teacher@gbspeaking.com', color: '#F59E0B' },
                  { role: 'Student', email: 'student@gbspeaking.com', color: '#10B981' },
                ].map(acc => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword(acc.role.toLowerCase() + '123'); }}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: `${acc.color}15`, color: acc.color, border: `1px solid ${acc.color}30`,
                    }}>{acc.role}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{acc.email}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>Click để điền</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
