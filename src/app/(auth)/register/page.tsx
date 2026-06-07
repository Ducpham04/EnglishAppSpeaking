'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Mic, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordChecks = [
    { label: 'Ít nhất 6 ký tự', valid: password.length >= 6 },
    { label: 'Mật khẩu khớp', valid: password.length > 0 && password === confirmPassword },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đăng ký thất bại');
        return;
      }

      // Auto sign in after register
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but auto-login failed, redirect to login
        router.push('/login');
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
              Đăng ký
            </h1>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
              Tạo tài khoản miễn phí để bắt đầu luyện nói
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
              {/* Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Họ và tên
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="register-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, color: 'var(--text-primary)', fontSize: 14,
                      outline: 'none', fontFamily: 'Inter, sans-serif',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="register-email"
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
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Mật khẩu
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="register-password"
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

              {/* Confirm Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Xác nhận mật khẩu
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="register-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, color: 'var(--text-primary)', fontSize: 14,
                      outline: 'none', fontFamily: 'Inter, sans-serif',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              {/* Password checks */}
              {password.length > 0 && (
                <div style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
                  {passwordChecks.map((check, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={13} style={{ color: check.valid ? '#10B981' : 'var(--text-muted)' }} />
                      <span style={{ fontSize: 12, color: check.valid ? '#10B981' : 'var(--text-muted)' }}>{check.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit */}
              <button
                id="register-submit-btn"
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
                    Đang tạo tài khoản...
                  </>
                ) : (
                  'Tạo tài khoản'
                )}
              </button>
            </form>

            {/* Login link */}
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
              Đã có tài khoản?{' '}
              <Link href="/login" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
