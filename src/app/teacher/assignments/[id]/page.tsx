import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit3,
  MessageSquareText,
  RotateCcw,
  Star,
  Users,
} from 'lucide-react';
import type { ConversationEvaluation } from '@/lib/types';
import { RetryAssignmentButton } from '@/components/TeacherAssignmentActions';

type EvaluationFlags = Pick<ConversationEvaluation, 'offTopic' | 'tooMuchVietnamese' | 'summary' | 'improvements' | 'importantNotes'>;

function parseEvaluation(feedbackJson: string | null): EvaluationFlags | null {
  if (!feedbackJson) return null;
  try {
    return JSON.parse(feedbackJson) as EvaluationFlags;
  } catch {
    return null;
  }
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function getOutcome(score: number | null, evaluation: EvaluationFlags | null) {
  if (evaluation?.tooMuchVietnamese) return { label: 'Dùng nhiều tiếng Việt', color: '#EF4444', icon: AlertCircle };
  if (evaluation?.offTopic) return { label: 'Lệch chủ đề', color: '#EF4444', icon: AlertCircle };
  if (score === null) return { label: 'Chưa chấm', color: '#6B7280', icon: Clock };
  if (score >= 75) return { label: 'Đạt', color: '#10B981', icon: CheckCircle2 };
  return { label: 'Cần luyện lại', color: '#F59E0B', icon: RotateCcw };
}

function formatDate(value: Date | null) {
  if (!value) return 'Không deadline';
  return value.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function TeacherAssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  const assignment = await prisma.assignment.findFirst({
    where: {
      id,
      ...(session.user.role === 'admin' ? {} : { teacherId: session.user.id }),
    },
    include: {
      topic: true,
      class: {
        include: {
          students: {
            where: { status: 'active' },
            include: { student: true },
            orderBy: { student: { name: 'asc' } },
          },
        },
      },
      sessions: {
        orderBy: { startedAt: 'desc' },
        include: {
          student: true,
          messages: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });

  if (!assignment) notFound();

  const completedSessions = assignment.sessions.filter(item => item.status === 'completed');
  const latestCompletedByStudent = new Map<string, typeof completedSessions[number]>();
  for (const item of completedSessions) {
    if (!latestCompletedByStudent.has(item.studentId)) {
      latestCompletedByStudent.set(item.studentId, item);
    }
  }

  const studentRows = assignment.class.students.map(enrollment => {
    const completed = latestCompletedByStudent.get(enrollment.studentId) ?? null;
    const active = assignment.sessions.find(item => item.studentId === enrollment.studentId && item.status === 'active') ?? null;
    const needsRetry = assignment.sessions.find(item => item.studentId === enrollment.studentId && item.status === 'needs_retry') ?? null;
    const evaluation = parseEvaluation(completed?.feedbackJson ?? null);
    const outcome = getOutcome(completed?.score ?? null, evaluation);
    return { enrollment, completed, active, needsRetry, evaluation, outcome };
  });

  const completedCount = studentRows.filter(row => row.completed).length;
  const needsRetryCount = studentRows.filter(row => row.needsRetry || (row.completed && row.outcome.label !== 'Đạt')).length;
  const completionRate = studentRows.length > 0 ? Math.round((completedCount / studentRows.length) * 100) : 0;
  const avgScore = average(studentRows.map(row => row.completed?.score ?? null));
  const avgTask = average(studentRows.map(row => row.completed?.taskScore ?? null));

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/teacher/assignments" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Quay lại bài tập
        </Link>
        <Link href={`/teacher/assignments/${assignment.id}/edit`} style={{ textDecoration: 'none' }}>
          <button className="btn-secondary" style={{ padding: '9px 14px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <Edit3 size={14} /> Sửa bài
          </button>
        </Link>
      </div>

      <section className="glass-card" style={{ padding: '26px 28px', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
            {assignment.topic.icon}
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>
              {assignment.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {assignment.class.name} · {assignment.topic.title} · Level {assignment.topic.level}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
              Deadline: {formatDate(assignment.deadline)} · Tối thiểu {Math.round(assignment.minDurationSec / 60)} phút · {assignment.minMessages} lượt nói
            </p>
          </div>
          <span style={{ padding: '5px 10px', borderRadius: 8, background: assignment.status === 'published' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: assignment.status === 'published' ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: 800 }}>
            {assignment.status === 'published' ? 'Đang mở' : assignment.status}
          </span>
        </div>

        {assignment.instruction && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 8 }}>Lesson brief / rubric</p>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{assignment.instruction}</p>
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Học viên', value: studentRows.length, icon: Users, color: '#06B6D4' },
          { label: 'Hoàn thành', value: `${completedCount}/${studentRows.length}`, icon: CheckCircle2, color: '#10B981' },
          { label: 'Tỉ lệ hoàn thành', value: `${completionRate}%`, icon: Star, color: '#7C3AED' },
          { label: 'Điểm TB', value: avgScore ?? '—', icon: Star, color: '#F59E0B' },
          { label: 'Task score TB', value: avgTask ?? '—', icon: MessageSquareText, color: '#EC4899' },
          { label: 'Cần luyện lại', value: needsRetryCount, icon: RotateCcw, color: '#EF4444' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color: item.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 850, color: 'var(--text-primary)' }}>{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
        {studentRows.map(row => {
          const OutcomeIcon = row.outcome.icon;
          const messages = row.completed?.messages ?? [];
          const userMessages = messages.filter(message => message.role === 'user');
          const assistantMessages = messages.filter(message => message.role === 'assistant');
          return (
            <article key={row.enrollment.studentId} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', color: '#06B6D4', fontWeight: 850, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {row.enrollment.student.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <h2 style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 800, marginBottom: 2 }}>{row.enrollment.student.name}</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.enrollment.student.email}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 8, background: `${row.outcome.color}14`, color: row.outcome.color, fontSize: 12, fontWeight: 800 }}>
                    <OutcomeIcon size={13} /> {row.active && !row.completed ? 'Đang luyện' : row.completed ? row.outcome.label : row.needsRetry ? 'Cần luyện lại' : 'Chưa làm'}
                  </span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 850, color: row.completed?.score && row.completed.score >= 75 ? '#10B981' : '#F59E0B' }}>
                    {row.completed?.score ?? '—'}
                  </span>
                  <RetryAssignmentButton assignmentId={assignment.id} studentId={row.enrollment.studentId} disabled={!row.completed} />
                </div>
              </div>

              {row.completed ? (
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(260px, 0.75fr) minmax(320px, 1.25fr)', gap: 16 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {[
                        ['Task', row.completed.taskScore],
                        ['Fluency', row.completed.fluencyScore],
                        ['Grammar', row.completed.grammarScore],
                        ['Vocab', row.completed.vocabularyScore],
                        ['Coherence', row.completed.coherenceScore],
                        ['Time', `${Math.round(row.completed.durationSec / 60)}p`],
                      ].map(([label, value]) => (
                        <div key={label} style={{ padding: '9px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 800 }}>{value ?? '—'}</p>
                        </div>
                      ))}
                    </div>
                    {row.evaluation?.summary && (
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.16)' }}>
                        <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{row.evaluation.summary}</p>
                      </div>
                    )}
                    {(row.evaluation?.offTopic || row.evaluation?.tooMuchVietnamese) && (
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                        <p style={{ fontSize: 12, color: '#EF4444', lineHeight: 1.6 }}>
                          {row.evaluation.tooMuchVietnamese && 'Dùng quá nhiều tiếng Việt. '}
                          {row.evaluation.offTopic && 'Nội dung lệch chủ đề/nhiệm vụ. '}
                          Nên yêu cầu học viên luyện lại.
                        </p>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', maxHeight: 320, overflow: 'auto' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 10 }}>
                      Transcript · {userMessages.length} lượt học viên · {assistantMessages.length} phản hồi AI
                    </p>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {messages.map(message => (
                        <div key={message.id} style={{ padding: '9px 10px', borderRadius: 8, background: message.role === 'user' ? 'rgba(6,182,212,0.08)' : 'rgba(124,58,237,0.07)' }}>
                          <p style={{ fontSize: 10, color: message.role === 'user' ? '#06B6D4' : 'var(--primary-light)', fontWeight: 800, marginBottom: 3 }}>
                            {message.role === 'user' ? 'Học viên' : 'AI'}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', fontSize: 13 }}>
                  {row.active ? 'Học viên đang có một buổi luyện chưa kết thúc.' : 'Học viên chưa bắt đầu bài luyện này.'}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
