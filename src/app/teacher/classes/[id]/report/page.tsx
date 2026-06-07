import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, ArrowLeft, Award, CheckCircle2, Clock, MessageSquare, TrendingDown, TrendingUp, Users } from 'lucide-react';

type Feedback = {
  summary?: string;
  improvements?: string[];
  importantNotes?: string[];
  offTopic?: boolean;
  tooMuchVietnamese?: boolean;
};

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}g ${m}p`;
  return `${m}p`;
}

function parseFeedback(value: string | null): Feedback {
  if (!value) return {};
  try {
    return JSON.parse(value) as Feedback;
  } catch {
    return {};
  }
}

function countPhrases(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
}

export default async function TeacherClassReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      students: { where: { status: 'active' }, include: { student: true } },
      assignments: { where: { status: 'published' }, include: { topic: true } },
    },
  });

  if (!cls || (cls.teacherId !== session.user.id && session.user.role !== 'admin')) notFound();

  const sessions = await prisma.session.findMany({
    where: { assignment: { classId: cls.id } },
    include: { student: true, assignment: { include: { topic: true } }, topic: true },
    orderBy: { startedAt: 'desc' },
  });

  const completed = sessions.filter(item => item.status === 'completed');
  const feedback = completed.map(item => parseFeedback(item.feedbackJson));
  const totalDuration = completed.reduce((sum, item) => sum + item.durationSec, 0);
  const totalMessages = completed.reduce((sum, item) => sum + item.totalUserMessages, 0);
  const offTopicCount = feedback.filter(item => item.offTopic).length;
  const vietnameseCount = feedback.filter(item => item.tooMuchVietnamese).length;
  const expectedCompletions = cls.students.length * cls.assignments.length;
  const completionRate = expectedCompletions > 0 ? Math.round((completed.length / expectedCompletions) * 100) : 0;

  const skillScores = [
    { label: 'Nhiệm vụ', value: average(completed.map(item => item.taskScore)), color: '#10B981' },
    { label: 'Trôi chảy', value: average(completed.map(item => item.fluencyScore)), color: '#06B6D4' },
    { label: 'Ngữ pháp', value: average(completed.map(item => item.grammarScore)), color: '#F59E0B' },
    { label: 'Từ vựng', value: average(completed.map(item => item.vocabularyScore)), color: '#8B5CF6' },
    { label: 'Mạch lạc', value: average(completed.map(item => item.coherenceScore)), color: '#EC4899' },
  ];

  const commonImprovements = countPhrases(feedback.flatMap(item => item.improvements ?? []));
  const commonNotes = countPhrases(feedback.flatMap(item => item.importantNotes ?? []));

  const studentRows = cls.students.map(enrollment => {
    const studentSessions = sessions.filter(item => item.studentId === enrollment.studentId);
    const studentCompleted = studentSessions.filter(item => item.status === 'completed');
    const completedAssignmentIds = new Set(studentCompleted.map(item => item.assignmentId).filter(Boolean));
    const avgScore = average(studentCompleted.map(item => item.score));
    const lastSession = studentSessions[0];
    const missingAssignments = cls.assignments.length - completedAssignmentIds.size;
    const atRisk = missingAssignments > 0 || (avgScore !== null && avgScore < 60);
    return {
      id: enrollment.studentId,
      name: enrollment.student.name,
      email: enrollment.student.email,
      completed: completedAssignmentIds.size,
      total: cls.assignments.length,
      avgScore,
      minutes: Math.round(studentCompleted.reduce((sum, item) => sum + item.durationSec, 0) / 60),
      messages: studentCompleted.reduce((sum, item) => sum + item.totalUserMessages, 0),
      lastActivity: lastSession?.startedAt ?? null,
      atRisk,
    };
  }).sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || (a.avgScore ?? 999) - (b.avgScore ?? 999));

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/teacher/classes/${cls.id}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Quay lại lớp {cls.name}
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 26 }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>Báo cáo chuyên sâu</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{cls.name} {cls.level ? `· ${cls.level}` : ''}</p>
        </div>
        <div style={{ padding: '9px 12px', borderRadius: 9, background: completionRate >= 80 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: completionRate >= 80 ? '#10B981' : '#F59E0B', fontWeight: 800, fontSize: 13 }}>
          Hoàn thành {completionRate}%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <Metric icon={Users} label="Học viên" value={cls.students.length} color="#10B981" />
        <Metric icon={CheckCircle2} label="Bài hoàn thành" value={`${completed.length}/${expectedCompletions}`} color="#06B6D4" />
        <Metric icon={Award} label="Điểm TB" value={average(completed.map(item => item.score)) ?? '—'} color="#F59E0B" />
        <Metric icon={Clock} label="Thời lượng" value={formatDuration(totalDuration)} color="#8B5CF6" />
        <Metric icon={MessageSquare} label="Lượt nói" value={totalMessages} color="#EC4899" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.85fr)', gap: 22, marginBottom: 22 }}>
        <section className="glass-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} /> Điểm kỹ năng
          </h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {skillScores.map(skill => {
              const value = skill.value ?? 0;
              return (
                <div key={skill.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{skill.label}</span>
                    <strong style={{ fontSize: 13, color: skill.color }}>{skill.value ?? '—'}</strong>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.07)' }}>
                    <div style={{ height: '100%', width: `${value}%`, borderRadius: 999, background: skill.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} /> Tín hiệu cần chú ý
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <Signal label="Dùng quá nhiều tiếng Việt" value={vietnameseCount} total={completed.length} tone="#F59E0B" />
            <Signal label="Lệch chủ đề/nhiệm vụ" value={offTopicCount} total={completed.length} tone="#EF4444" />
            <Signal label="Học viên cần can thiệp" value={studentRows.filter(item => item.atRisk).length} total={studentRows.length} tone="#8B5CF6" />
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 22, marginBottom: 22 }}>
        <PhrasePanel title="Lỗi/cải thiện thường gặp" items={commonImprovements} empty="Chưa đủ feedback để tổng hợp lỗi." />
        <PhrasePanel title="Lưu ý nên nhắc cả lớp" items={commonNotes} empty="Chưa có lưu ý nổi bật." />
      </div>

      <section className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingDown size={18} style={{ color: '#F59E0B' }} />
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800 }}>Theo dõi từng học viên</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Học viên', 'Hoàn thành', 'Điểm TB', 'Thời lượng', 'Lượt nói', 'Hoạt động cuối', 'Trạng thái'].map(label => (
                <th key={label} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {studentRows.map((student, index) => (
              <tr key={student.id} style={{ borderBottom: index < studentRows.length - 1 ? '1px solid rgba(255,255,255,0.045)' : 'none' }}>
                <td style={{ padding: '13px 16px' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 750 }}>{student.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student.email}</p>
                </td>
                <td style={{ padding: '13px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{student.completed}/{student.total}</td>
                <td style={{ padding: '13px 16px', color: student.avgScore !== null && student.avgScore < 60 ? '#EF4444' : 'var(--text-primary)', fontSize: 13, fontWeight: 800 }}>{student.avgScore ?? '—'}</td>
                <td style={{ padding: '13px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{student.minutes}p</td>
                <td style={{ padding: '13px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{student.messages}</td>
                <td style={{ padding: '13px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{student.lastActivity ? student.lastActivity.toLocaleDateString('vi-VN') : '—'}</td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 7, background: student.atRisk ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: student.atRisk ? '#EF4444' : '#10B981' }}>
                    {student.atRisk ? 'Cần theo dõi' : 'Ổn'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 13 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 850, color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

function Signal({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ padding: 12, borderRadius: 9, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
        <strong style={{ fontSize: 13, color: tone }}>{value}</strong>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: tone, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function PhrasePanel({ title, items, empty }: { title: string; items: Array<{ label: string; count: number }>; empty: string }) {
  return (
    <section className="glass-card" style={{ padding: 22 }}>
      <h2 style={{ fontSize: 17, color: 'var(--text-primary)', fontWeight: 800, marginBottom: 14 }}>{title}</h2>
      {items.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{empty}</p>
      ) : (
        <div style={{ display: 'grid', gap: 9 }}>
          {items.map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item.label}</span>
              <strong style={{ fontSize: 12, color: 'var(--primary-light)' }}>{item.count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
