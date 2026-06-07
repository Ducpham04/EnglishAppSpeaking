'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function CreateClassPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Tên lớp không được để trống'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, level }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Tạo lớp thất bại'); return; }
      router.push(`/teacher/classes/${data.id}`);
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 560 }}>
        <div style={{ marginBottom: 28 }}>
          <Link href="/teacher/classes" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Quay lại lớp học
          </Link>
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 28 }}>Tạo lớp học mới</h1>

        <div className="glass-card" style={{ padding: '32px 28px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 8 }}>
              <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Tên lớp *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: English B1 — Buổi tối" required
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Mô tả lớp</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả ngắn về lớp học..." rows={3}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Trình độ</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                <button type="button" onClick={() => setLevel('')} style={{ padding: '8px 4px', borderRadius: 8, border: `1px solid ${!level ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: !level ? 'rgba(124,58,237,0.15)' : 'transparent', color: !level ? 'var(--primary-light)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>Tất cả</button>
                {LEVELS.map(l => (
                  <button type="button" key={l} onClick={() => setLevel(l)} style={{ padding: '8px 4px', borderRadius: 8, border: `1px solid ${level === l ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: level === l ? 'rgba(124,58,237,0.15)' : 'transparent', color: level === l ? 'var(--primary-light)' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading} id="create-class-btn"
              style={{ width: '100%', padding: '14px 0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isLoading ? <><Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> Đang tạo...</> : '✅ Tạo lớp học'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
