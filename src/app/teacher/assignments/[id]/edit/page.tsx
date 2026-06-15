'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';

interface ClassOption { id: string; name: string; level: string | null; }
interface TopicOption { id: string; title: string; icon: string; level: string; }

interface AssignmentDetail {
  id: string;
  classId: string;
  topicId: string;
  title: string;
  instruction: string | null;
  deadline: string | null;
  minDurationSec: number;
  minMessages: number;
  status: string;
  class: { id: string; name: string };
  topic: { id: string; title: string; icon: string; level: string };
}

function toDatetimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function EditAssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [classId, setClassId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState('');
  const [deadline, setDeadline] = useState('');
  const [minDuration, setMinDuration] = useState(5);
  const [minMessages, setMinMessages] = useState(5);
  const [status, setStatus] = useState('published');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [assignmentRes, classesRes, topicsRes] = await Promise.all([
          fetch(`/api/assignments/${id}`, { cache: 'no-store' }),
          fetch('/api/classes', { cache: 'no-store' }),
          fetch('/api/topics', { cache: 'no-store' }),
        ]);

        const assignmentData = await assignmentRes.json();
        const classesData = await classesRes.json();
        const topicsData = await topicsRes.json();

        if (!assignmentRes.ok) {
          setError(assignmentData.error || 'Không thể tải bài tập');
          return;
        }

        setAssignment(assignmentData);
        setClasses(classesData.classes || []);
        setTopics(topicsData.topics || []);
        setClassId(assignmentData.classId);
        setTopicId(assignmentData.topicId);
        setTitle(assignmentData.title);
        setInstruction(assignmentData.instruction || '');
        setDeadline(toDatetimeLocal(assignmentData.deadline));
        setMinDuration(Math.max(1, Math.round((assignmentData.minDurationSec || 300) / 60)));
        setMinMessages(assignmentData.minMessages || 5);
        setStatus(assignmentData.status || 'published');
      } catch {
        setError('Không thể tải bài tập');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!classId || !topicId || !title.trim()) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          topicId,
          title,
          instruction,
          deadline: deadline || null,
          minDurationSec: minDuration * 60,
          minMessages,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể cập nhật bài tập');
        return;
      }
      router.push('/teacher/assignments');
    } catch {
      setError('Không thể cập nhật bài tập');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTopic = topics.find(t => t.id === topicId) || assignment?.topic;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/teacher/assignments" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Quay lại bài tập
          </Link>
        </div>

        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 8 }}>
          Sửa bài tập
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Cập nhật nội dung giao bài, hạn nộp và yêu cầu luyện tập.
        </p>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
            <Loader2 size={32} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--primary-light)' }} />
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '32px 28px' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 8 }}>
                <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Lớp học *</label>
                  <select value={classId} onChange={e => setClassId(e.target.value)} required
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                    <option value="">-- Chọn lớp --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.level ? ` (${c.level})` : ''}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Trạng thái</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                    <option value="published">Đang mở</option>
                    <option value="draft">Nháp</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Chủ đề luyện nói *</label>
                <select value={topicId} onChange={e => setTopicId(e.target.value)} required
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                  <option value="">-- Chọn chủ đề --</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.icon} {t.title} ({t.level})</option>)}
                </select>
                {selectedTopic && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(124,58,237,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    Level {selectedTopic.level} · {selectedTopic.icon} {selectedTopic.title}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Tiêu đề bài tập *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Hướng dẫn cho học viên</label>
                <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={4}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Deadline</label>
                  <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
                    style={{ width: '100%', padding: '12px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Tối thiểu (phút)</label>
                  <input type="number" min={1} max={30} value={minDuration} onChange={e => setMinDuration(Number(e.target.value))}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Tối thiểu (lượt nói)</label>
                  <input type="number" min={2} max={20} value={minMessages} onChange={e => setMinMessages(Number(e.target.value))}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={isSaving}
                style={{ width: '100%', padding: '14px 0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isSaving ? <><Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> Đang lưu...</> : <><Save size={16} /> Lưu thay đổi</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
