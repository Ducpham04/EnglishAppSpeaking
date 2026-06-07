'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareText,
  Mic,
  Target,
} from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  instruction: string | null;
  minDurationSec: number;
  minMessages: number;
  topic: { id: string; title: string; icon: string; level: string; systemPrompt: string; openingQuestion: string | null; description?: string | null };
  class: { name: string };
  deadline: string | null;
}

function extractSection(instruction: string | null, label: string) {
  if (!instruction) return '';
  const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\n(?:Mục tiêu|Tình huống\\/vai hội thoại|Tiêu chí cần đạt|Hướng dẫn thêm):|$)`, 'i');
  return instruction.match(pattern)?.[1]?.trim() ?? '';
}

function extractRubric(instruction: string | null) {
  const section = extractSection(instruction, 'Tiêu chí cần đạt');
  if (!section) return [];
  return section
    .split('\n')
    .map(item => item.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}

function formatDeadline(value: string | null) {
  if (!value) return 'Không giới hạn';
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return 'Không giới hạn';
  const now = new Date();
  const overdue = deadline.getTime() < now.getTime();
  const label = deadline.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return overdue ? `Đã hết hạn · ${label}` : label;
}

export default function AssignmentPracticePage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/assignments/${id}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setAssignment(data);
      })
      .catch(() => setError('Không thể tải bài tập'))
      .finally(() => setLoading(false));
  }, [id]);

  const lessonBrief = useMemo(() => {
    const goal = extractSection(assignment?.instruction ?? null, 'Mục tiêu');
    const scenario = extractSection(assignment?.instruction ?? null, 'Tình huống\\/vai hội thoại');
    const extra = extractSection(assignment?.instruction ?? null, 'Hướng dẫn thêm');
    const rubric = extractRubric(assignment?.instruction ?? null);
    return { goal, scenario, extra, rubric };
  }, [assignment?.instruction]);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={32} style={{ animation: 'spin-slow 1s linear infinite', color: 'var(--primary-light)' }} />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !assignment) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#EF4444', marginBottom: 16 }}>{error || 'Không tìm thấy bài tập'}</p>
          <Link href="/student/assignments"><button className="btn-secondary" style={{ padding: '10px 20px' }}>← Quay lại</button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const practiceUrl = `/demo?assignmentId=${id}&topicId=${assignment.topic.id}&level=${assignment.topic.level}&title=${encodeURIComponent(assignment.title)}&autoStart=1`;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 24 }}>
        <Link href="/student/assignments" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Quay lại bài tập
        </Link>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <section className="glass-card" style={{ padding: '28px 30px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
            <span style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>
              {assignment.topic.icon}
            </span>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 850, fontSize: 28, color: 'var(--text-primary)', marginBottom: 8 }}>{assignment.title}</h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>{assignment.class.name} · Level {assignment.topic.level} · {assignment.topic.title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Deadline: {formatDeadline(assignment.deadline)}</p>
            </div>
            <Link href={practiceUrl} style={{ textDecoration: 'none' }}>
              <button className="btn-primary" id="start-practice-btn" style={{ padding: '13px 22px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Mic size={17} /> Vào phòng luyện
              </button>
            </Link>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <section className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Target size={18} style={{ color: '#10B981' }} />
                <h2 style={{ fontSize: 16, fontWeight: 850, color: 'var(--text-primary)' }}>Mục tiêu & tình huống</h2>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <BriefBlock label="Mục tiêu" value={lessonBrief.goal || 'Hoàn thành cuộc hội thoại đúng chủ đề bằng tiếng Anh.'} />
                <BriefBlock label="Tình huống" value={lessonBrief.scenario || assignment.topic.description || assignment.topic.openingQuestion || 'Hãy trả lời theo ngữ cảnh AI đưa ra.'} />
                {lessonBrief.extra && <BriefBlock label="Hướng dẫn thêm" value={lessonBrief.extra} />}
              </div>
            </section>

            <section className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <MessageSquareText size={18} style={{ color: '#F59E0B' }} />
                <h2 style={{ fontSize: 16, fontWeight: 850, color: 'var(--text-primary)' }}>Tiêu chí chấm điểm</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                {(lessonBrief.rubric.length > 0 ? lessonBrief.rubric : [
                  'Trả lời đúng chủ đề và nhiệm vụ',
                  'Dùng tiếng Anh trong phần lớn câu trả lời',
                  'Nói đủ lượt và đủ thời gian yêu cầu',
                  'Câu trả lời rõ ràng, có liên kết',
                ]).map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                    <CheckCircle2 size={15} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside style={{ display: 'grid', gap: 14 }}>
            <div className="glass-card" style={{ padding: 22 }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 14 }}>Điều kiện hoàn thành</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                <Metric icon={Clock} label="Thời gian tối thiểu" value={`${Math.round(assignment.minDurationSec / 60)} phút`} color="#06B6D4" />
                <Metric icon={MessageSquareText} label="Lượt nói tối thiểu" value={`${assignment.minMessages} lượt`} color="#7C3AED" />
                <Metric icon={Target} label="Trạng thái cần đạt" value="Đúng chủ đề" color="#10B981" />
              </div>
            </div>

            <div className="glass-card" style={{ padding: 18, borderColor: 'rgba(245,158,11,0.22)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={17} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  Hãy nói bằng tiếng Anh và bám sát tình huống. Nếu trả lời bằng tiếng Việt quá nhiều hoặc lệch chủ đề, điểm nhiệm vụ sẽ bị giảm mạnh.
                </p>
              </div>
            </div>

            <Link href={practiceUrl} style={{ textDecoration: 'none', display: 'block' }}>
              <button className="btn-primary" style={{ width: '100%', padding: '15px 0', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Mic size={18} /> Bắt đầu ngay
              </button>
            </Link>

            {session && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Kết quả sẽ được tự động lưu vào tài khoản của bạn
              </p>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function BriefBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 850, marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: ElementType; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, borderRadius: 9, background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 850 }}>{value}</p>
      </div>
    </div>
  );
}
