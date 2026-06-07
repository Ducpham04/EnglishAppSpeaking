'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import type { CEFRLevel } from '@/lib/types';

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

type TopicDetail = {
  id: string;
  title: string;
  description: string | null;
  level: CEFRLevel;
  icon: string;
  openingQuestion: string | null;
  systemPrompt: string;
  isPublic: boolean;
  _count?: { assignments: number; sessions: number };
};

export default function EditTeacherTopicPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<CEFRLevel>('A1');
  const [icon, setIcon] = useState('🗣️');
  const [openingQuestion, setOpeningQuestion] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTopic = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/teacher/topics/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Không thể tải topic');
          return;
        }
        const loaded = data.topic as TopicDetail;
        setTopic(loaded);
        setTitle(loaded.title);
        setDescription(loaded.description || '');
        setLevel(loaded.level);
        setIcon(loaded.icon || '🗣️');
        setOpeningQuestion(loaded.openingQuestion || '');
        setSystemPrompt(loaded.systemPrompt || '');
        setIsPublic(loaded.isPublic);
      } catch {
        setError('Không thể tải topic');
      } finally {
        setLoading(false);
      }
    };

    loadTopic();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !openingQuestion.trim() || !systemPrompt.trim()) {
      setError('Tiêu đề, câu mở đầu và system prompt là bắt buộc');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/teacher/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          level,
          icon,
          openingQuestion,
          systemPrompt,
          isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể lưu topic');
        return;
      }
      router.push('/teacher/topics');
    } catch {
      setError('Không thể lưu topic');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 820 }}>
        <div style={{ marginBottom: 22 }}>
          <Link href="/teacher/topics" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Quay lại thư viện hội thoại
          </Link>
        </div>

        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>
          Sửa hội thoại AI
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Cập nhật vai trò AI, câu mở đầu và prompt để dùng lại trong các bài luyện.
        </p>

        {loading ? (
          <div style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={32} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--primary-light)' }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28 }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} style={{ color: '#EF4444' }} />
                <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
              </div>
            )}

            {topic && (
              <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', fontSize: 12 }}>
                Đang dùng trong {topic._count?.assignments ?? 0} bài tập và {topic._count?.sessions ?? 0} buổi luyện.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 120px', gap: 14, marginBottom: 16 }}>
              <label>
                <span style={labelStyle}>Tiêu đề *</span>
                <input value={title} onChange={event => setTitle(event.target.value)} style={fieldStyle} />
              </label>
              <label>
                <span style={labelStyle}>Level *</span>
                <select value={level} onChange={event => setLevel(event.target.value as CEFRLevel)} style={fieldStyle}>
                  {LEVELS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span style={labelStyle}>Icon</span>
                <input value={icon} onChange={event => setIcon(event.target.value)} style={fieldStyle} />
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={labelStyle}>Mô tả</span>
              <textarea value={description} onChange={event => setDescription(event.target.value)} rows={2} style={textareaStyle} />
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={labelStyle}>Câu mở đầu *</span>
              <textarea value={openingQuestion} onChange={event => setOpeningQuestion(event.target.value)} rows={3} style={textareaStyle} />
            </label>

            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={labelStyle}>System prompt *</span>
              <textarea value={systemPrompt} onChange={event => setSystemPrompt(event.target.value)} rows={6} style={textareaStyle} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.035)', marginBottom: 22 }}>
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>Cho phép học viên chọn tự do</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nếu tắt, topic chỉ dùng được khi giáo viên giao bài.</span>
              </span>
              <input type="checkbox" checked={isPublic} onChange={event => setIsPublic(event.target.checked)} />
            </label>

            <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Save size={16} />}
              Lưu thay đổi
            </button>
          </form>
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
};

const textareaStyle = {
  ...fieldStyle,
  resize: 'vertical' as const,
  fontFamily: 'Inter, sans-serif',
  lineHeight: 1.5,
};
