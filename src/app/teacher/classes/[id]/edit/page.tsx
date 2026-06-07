'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertCircle, ArrowLeft, Loader2, Save, Shuffle } from 'lucide-react';

type ClassDetail = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  joinCode: string;
  status: string;
};

export default function EditClassPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadClass = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/classes', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Không thể tải lớp');
          return;
        }
        const found = (data.classes || []).find((item: ClassDetail) => item.id === id);
        if (!found) {
          setError('Không tìm thấy lớp');
          return;
        }
        setCls(found);
        setName(found.name);
        setDescription(found.description || '');
        setLevel(found.level || '');
        setStatus(found.status || 'active');
      } catch {
        setError('Không thể tải lớp');
      } finally {
        setLoading(false);
      }
    };

    loadClass();
  }, [id]);

  const saveClass = async (regenerateJoinCode = false) => {
    if (!name.trim()) {
      setError('Tên lớp không được để trống');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, level, status, regenerateJoinCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể lưu lớp');
        return;
      }
      router.push(`/teacher/classes/${id}`);
    } catch {
      setError('Không thể lưu lớp');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: 22 }}>
          <Link href={`/teacher/classes/${id}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Quay lại lớp
          </Link>
        </div>

        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>Sửa lớp học</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>Cập nhật thông tin lớp, trạng thái và mã tham gia.</p>

        {loading ? (
          <div style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={32} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--primary-light)' }} />
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 28 }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} style={{ color: '#EF4444' }} />
                <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
              </div>
            )}

            {cls && (
              <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Mã lớp hiện tại</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, letterSpacing: 2, fontWeight: 850, color: '#06B6D4' }}>{cls.joinCode}</p>
                </div>
                <button type="button" disabled={saving} onClick={() => saveClass(true)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.09)', color: '#06B6D4', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Shuffle size={14} /> Đổi mã
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gap: 16 }}>
              <label>
                <span style={labelStyle}>Tên lớp *</span>
                <input value={name} onChange={event => setName(event.target.value)} style={fieldStyle} />
              </label>
              <label>
                <span style={labelStyle}>Mô tả</span>
                <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label>
                  <span style={labelStyle}>Level</span>
                  <input value={level} onChange={event => setLevel(event.target.value)} placeholder="B1, IELTS 5.5..." style={fieldStyle} />
                </label>
                <label>
                  <span style={labelStyle}>Trạng thái</span>
                  <select value={status} onChange={event => setStatus(event.target.value)} style={fieldStyle}>
                    <option value="active">Đang mở</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </label>
              </div>
              <button type="button" className="btn-primary" disabled={saving} onClick={() => saveClass(false)} style={{ width: '100%', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Save size={16} />}
                Lưu lớp
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--text-secondary)',
};

const fieldStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  fontSize: 14,
  boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
};
