'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Loader2, Mic, CheckCircle } from 'lucide-react';
import { CEFRLevel } from '@/lib/types';

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function TeacherTopicCreatePage() {
  const router = useRouter();
  const [classId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('classId') || '';
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<CEFRLevel>('A1');
  const [icon, setIcon] = useState('🗣️');
  const [openingQuestion, setOpeningQuestion] = useState('Hello! Let’s talk about your favorite topic.');
  const [systemPrompt, setSystemPrompt] = useState('You are a friendly conversation partner helping a student practice speaking English. Keep replies supportive and level appropriate.');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!title.trim() || !openingQuestion.trim() || !systemPrompt.trim()) {
      setError('Tiêu đề, câu mở đầu và system prompt là bắt buộc');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/teacher/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          level,
          icon: icon.trim() || '🗣️',
          openingQuestion: openingQuestion.trim(),
          systemPrompt: systemPrompt.trim(),
          isPublic,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Tạo chủ đề thất bại.');
        return;
      }

      if (classId) {
        router.push(`/teacher/assignments/create?classId=${classId}&topicId=${data.topic.id}`);
      } else {
        router.push(`/teacher/assignments/create?topicId=${data.topic.id}`);
      }
    } catch {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 0' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <Link href="/teacher/dashboard" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
              <ArrowLeft size={14} /> Quay lại dashboard
            </Link>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', margin: '18px 0 8px' }}>
              Tạo cuộc hội thoại theo yêu cầu của bạn
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 680 }}>
              Nhập chủ đề, câu mở đầu và hướng dẫn AI. Sau khi tạo, bạn sẽ quay lại màn giao bài để gửi conversation này cho học viên.
            </p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.04)' }}>
            <Mic size={18} />
            <span style={{ fontSize: 13 }}>Dành cho giáo viên</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 32, marginBottom: 32 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 14, padding: 16, marginBottom: 24 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Tiêu đề buổi luyện *</span>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Nói về sở thích cá nhân"
                  style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Level *</span>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value as CEFRLevel)}
                  style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
                >
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Biểu tượng</span>
                <input
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  placeholder="🗣️"
                  style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
                />
              </label>
              <label style={{ display: 'block', alignSelf: 'end' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Cho phép học viên chọn?</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isPublic ? 'Có' : 'Không'}</span>
                    <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nếu bật, topic này sẽ xuất hiện trong danh sách chủ đề có thể chọn.</p>
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Mô tả ngắn</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Mô tả mục tiêu hoặc hướng dẫn cho học viên"
                style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Câu mở đầu *</span>
              <textarea
                value={openingQuestion}
                onChange={e => setOpeningQuestion(e.target.value)}
                rows={3}
                placeholder="Hello! Please tell me about your favourite travel destination."
                style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 28 }}>
              <span style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>System prompt *</span>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={5}
                placeholder="You are a supportive speaking partner. Ask simple follow-up questions. Praise the student often."
                style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
              />
            </label>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '16px 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15 }}
              disabled={isLoading}
            >
              {isLoading ? <><Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> Đang tạo...</> : <><CheckCircle size={16} /> Tạo conversation để giao bài</>}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
