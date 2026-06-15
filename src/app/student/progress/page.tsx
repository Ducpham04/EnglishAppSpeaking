import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import Link from 'next/link';
import { Award, BookOpen, CheckCircle, Clock, Flame, Mic, Star, Target, TrendingUp } from 'lucide-react';
import {
  aggregateFeedbackNotes,
  aggregateMistakes,
  average as insightAverage,
  buildSkillScores,
  weakestSkill,
} from '@/lib/speaking-insights';

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}g ${m}p`;
  return `${m} phút`;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function StudentProgressPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'student' && session.user.role !== 'admin') redirect('/');

  const studentId = session.user.id;

  const [sessions, assignments, enrollments] = await Promise.all([
    prisma.session.findMany({
      where: { studentId },
      orderBy: { startedAt: 'desc' },
      include: {
        topic: true,
        assignment: { include: { class: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.assignment.findMany({
      where: {
        class: { status: 'active', students: { some: { studentId, status: 'active' } } },
        status: 'published',
      },
      include: { sessions: { where: { studentId, status: 'completed' } } },
    }),
    prisma.classStudent.findMany({
      where: { studentId },
      include: { class: { include: { teacher: { select: { name: true } } } } },
      orderBy: { joinedAt: 'desc' },
    }),
  ]);

  const completedSessions = sessions.filter(item => item.status === 'completed');
  const totalDuration = completedSessions.reduce((sum, item) => sum + item.durationSec, 0);
  const totalUserMessages = completedSessions.reduce((sum, item) => sum + item.totalUserMessages, 0);
  const averageScore = insightAverage(completedSessions.map(item => item.score));
  const completedAssignments = assignments.filter(item => item.sessions.length > 0).length;
  const completionRate = assignments.length > 0 ? Math.round((completedAssignments / assignments.length) * 100) : 0;

  const today = startOfDay(new Date());
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const hasSession = completedSessions.some(item => startOfDay(item.startedAt).getTime() === day.getTime());
    if (hasSession) streak++;
    else break;
  }

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (6 - index));
    const daySessions = completedSessions.filter(item => startOfDay(item.startedAt).getTime() === day.getTime());
    return {
      label: formatShortDate(day),
      count: daySessions.length,
      minutes: Math.round(daySessions.reduce((sum, item) => sum + item.durationSec, 0) / 60),
    };
  });
  const maxWeeklyMinutes = Math.max(1, ...weekly.map(item => item.minutes));

  const skillScores = [
    { label: 'Fluency', value: insightAverage(completedSessions.map(item => item.fluencyScore)), color: '#0F766E' },
    { label: 'Grammar', value: insightAverage(completedSessions.map(item => item.grammarScore)), color: '#D97706' },
    { label: 'Vocabulary', value: insightAverage(completedSessions.map(item => item.vocabularyScore)), color: '#2563EB' },
    { label: 'Overall', value: averageScore, color: '#7C3AED' },
  ];
  const fullSkillScores = buildSkillScores({
    taskScore: insightAverage(completedSessions.map(item => item.taskScore)),
    fluencyScore: insightAverage(completedSessions.map(item => item.fluencyScore)),
    grammarScore: insightAverage(completedSessions.map(item => item.grammarScore)),
    vocabularyScore: insightAverage(completedSessions.map(item => item.vocabularyScore)),
    coherenceScore: insightAverage(completedSessions.map(item => item.coherenceScore)),
    overallScore: averageScore,
  });
  const weakest = weakestSkill(fullSkillScores);
  const mistakes = aggregateMistakes(completedSessions.flatMap(item => item.messages)).slice(0, 4);
  const feedback = aggregateFeedbackNotes(completedSessions);
  const nextFocus = weakest
    ? `Tập trung luyện ${weakest.label.toLowerCase()} trong buổi tiếp theo.`
    : 'Hoàn thành một buổi luyện để hệ thống gợi ý kỹ năng cần tập trung.';

  const recentSessions = completedSessions.slice(0, 6);

  return (
    <DashboardLayout title="Tiến độ học tập">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatsCard icon={Mic} label="Buổi hoàn thành" value={completedSessions.length} color="#7C3AED" />
        <StatsCard icon={Clock} label="Thời gian luyện" value={formatDuration(totalDuration)} color="#06B6D4" />
        <StatsCard icon={Star} label="Điểm trung bình" value={averageScore ?? '—'} color="#F59E0B" />
        <StatsCard icon={Flame} label="Streak" value={`${streak} ngày`} color="#EF4444" />
        <StatsCard icon={CheckCircle} label="Hoàn thành bài tập" value={`${completionRate}%`} sub={`${completedAssignments}/${assignments.length} bài`} color="#10B981" />
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 850, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} style={{ color: 'var(--primary)' }} /> Lộ trình luyện tiếp
          </h2>
          <Link href="/demo" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '10px 16px', fontSize: 13 }}>Luyện ngay</button>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(280px, 0.9fr)', gap: 16 }}>
          <section style={{ padding: 14, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 850, textTransform: 'uppercase', marginBottom: 8 }}>Next best practice</p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 800, marginBottom: 6 }}>{nextFocus}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {weakest?.value !== null && weakest
                ? `${weakest.label} hiện khoảng ${weakest.value}/100. Hãy làm một roleplay ngắn và cố gắng nói dài hơn mỗi lượt.`
                : 'Sau khi có thêm dữ liệu, hệ thống sẽ gợi ý rõ hơn theo điểm kỹ năng của bạn.'}
            </p>
          </section>

          <section style={{ padding: 14, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 850, textTransform: 'uppercase', marginBottom: 8 }}>Câu nên luyện lại</p>
            {mistakes.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>Chưa có lỗi lặp lại. Hãy hoàn thành thêm vài buổi luyện để tạo mistake bank.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {mistakes.slice(0, 2).map(mistake => (
                  <div key={`${mistake.type}-${mistake.wrong}-${mistake.right}`}>
                    <p style={{ fontSize: 12, color: '#DC2626', textDecoration: 'line-through', marginBottom: 3 }}>{mistake.wrong}</p>
                    <p style={{ fontSize: 13, color: '#166534', fontWeight: 850 }}>{mistake.right}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ padding: 14, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 850, textTransform: 'uppercase', marginBottom: 8 }}>Tín hiệu cần chú ý</p>
            <LearningSignal label="Dùng nhiều tiếng Việt" value={feedback.tooMuchVietnamese} />
            <LearningSignal label="Lệch chủ đề" value={feedback.offTopic} />
            {feedback.improvements[0] && (
              <div style={{ paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{feedback.improvements[0].label}</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)', gap: 24, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} /> 7 ngày gần đây
          </h2>
          <div style={{ height: 220, display: 'flex', alignItems: 'flex-end', gap: 12, paddingTop: 12 }}>
            {weekly.map(item => (
              <div key={item.label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: '100%', height: 160, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    minHeight: item.minutes > 0 ? 8 : 2,
                    height: `${Math.max(2, (item.minutes / maxWeeklyMinutes) * 100)}%`,
                    borderRadius: '8px 8px 3px 3px',
                    background: item.minutes > 0 ? 'var(--primary)' : '#E5E7EB',
                    border: '1px solid #E5E7EB',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontSize: 12, color: item.minutes > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700 }}>{item.minutes}p</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={18} /> Kỹ năng
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {skillScores.map(skill => {
              const value = skill.value ?? 0;
              return (
                <div key={skill.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{skill.label}</span>
                    <span style={{ fontSize: 13, color: skill.color, fontWeight: 800 }}>{skill.value ?? '—'}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', background: '#E5E7EB' }}>
                    <div style={{ width: `${value}%`, height: '100%', borderRadius: 4, background: skill.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.8fr)', gap: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Buổi luyện gần đây</h2>
          {recentSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Mic size={36} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>Chưa có dữ liệu tiến độ. Hoàn thành một buổi luyện nói để bắt đầu theo dõi.</p>
              <Link href="/demo"><button className="btn-primary" style={{ padding: '10px 20px' }}>Luyện nói ngay</button></Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentSessions.map(item => (
                <Link key={item.id} href={`/student/sessions/${item.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{item.topic.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{item.topic.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatShortDate(item.startedAt)} · {formatDuration(item.durationSec)} · {item.totalUserMessages} lượt nói
                      </p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#F59E0B' }}>{item.score ?? '—'}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} /> Lớp đang học
          </h2>
          {enrollments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Bạn chưa tham gia lớp nào. Nhập mã lớp ở Dashboard để nhận bài tập từ giáo viên.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enrollments.map(item => (
                <div key={item.id} style={{ padding: '12px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{item.class.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.class.teacher.name} {item.class.level ? `· ${item.class.level}` : ''}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng lượt nói đã ghi nhận</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{totalUserMessages.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function LearningSignal({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid #E5E7EB' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <strong style={{ fontSize: 12, color: value > 0 ? '#D97706' : '#16A34A' }}>{value}</strong>
    </div>
  );
}
