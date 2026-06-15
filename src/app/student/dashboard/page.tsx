import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import StudentJoinClassForm from '@/components/StudentJoinClassForm';
import Link from 'next/link';
import { Mic, Clock, Star, Flame, CheckCircle, ChevronRight, BookOpen, ClipboardList, History, BarChart3, Target, MessageSquareText, Sparkles } from 'lucide-react';

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}g ${m}p`;
  return `${m} phút`;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function StudentDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'student' && session.user.role !== 'admin') redirect('/');

  const studentId = session.user.id;

  const [sessions, assignments, enrollments] = await Promise.all([
    prisma.session.findMany({
      where: { studentId },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: { topic: true },
    }),
    prisma.assignment.findMany({
      where: {
        class: { status: 'active', students: { some: { studentId, status: 'active' } } },
        status: 'published',
      },
      include: { topic: true, class: true },
      orderBy: { deadline: 'asc' },
      take: 5,
    }),
    prisma.classStudent.count({ where: { studentId, status: 'active', class: { status: 'active' } } }),
  ]);

  const totalSessions = await prisma.session.count({ where: { studentId } });
  const completedSessions = await prisma.session.count({ where: { studentId, status: 'completed' } });
  const totalDuration = await prisma.session.aggregate({ where: { studentId }, _sum: { durationSec: true } });
  const avgScore = await prisma.session.aggregate({
    where: { studentId, score: { not: null } },
    _avg: { score: true },
  });

  const recentSessions = await prisma.session.findMany({
    where: { studentId, status: 'completed' },
    orderBy: { startedAt: 'desc' },
    take: 30,
  });
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 30; i++) {
    const day = new Date(today); day.setDate(day.getDate() - i);
    const hasSession = recentSessions.some(s => {
      const d = new Date(s.startedAt); d.setHours(0,0,0,0);
      return d.getTime() === day.getTime();
    });
    if (hasSession) streak++;
    else break;
  }

  const pendingAssignments = assignments.filter(a => {
    const done = sessions.some(s => s.assignmentId === a.id && s.status === 'completed');
    return !done;
  });
  const nextAssignment = pendingAssignments[0];
  const latestCompleted = sessions.find(s => s.status === 'completed');
  const practiceGoal = Math.max(3, Math.min(8, pendingAssignments.length + 3));
  const completedToday = recentSessions.filter(s => {
    const d = new Date(s.startedAt); d.setHours(0,0,0,0);
    return d.getTime() === today.getTime();
  }).length;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
          Student workspace
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', marginBottom: 6 }}>
          Xin chào, {session.user.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Theo dõi bài tập, lịch sử luyện nói và tiến độ của bạn tại một nơi.</p>
      </div>

      <section className="student-focus-hero">
        <div className="student-focus-main">
          <div className="student-focus-badge">
            <Sparkles size={14} />
            Hôm nay nên luyện {practiceGoal} lượt nói
          </div>
          <h2>
            {nextAssignment ? `Tiếp tục bài: ${nextAssignment.title}` : 'Bắt đầu một phiên speaking mới'}
          </h2>
          <p>
            {nextAssignment
              ? `${nextAssignment.class.name} · ${nextAssignment.topic.title} · Level ${nextAssignment.topic.level}`
              : 'Chọn topic bất kỳ, nói trực tiếp bằng micro và nhận transcript, sửa lỗi, điểm kỹ năng sau buổi luyện.'}
          </p>
          <div className="student-focus-actions">
            <Link href={nextAssignment ? `/student/assignments/${nextAssignment.id}/practice` : '/demo'} style={{ textDecoration: 'none' }}>
              <button className="btn-primary" id="quick-practice-btn" style={{ padding: '13px 22px', fontSize: 14 }}>
                <Mic size={16} /> {nextAssignment ? 'Làm bài được giao' : 'Luyện ngay'}
              </button>
            </Link>
            <Link href="/student/progress" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ padding: '13px 18px', fontSize: 14 }}>
                <BarChart3 size={16} /> Xem tiến bộ
              </button>
            </Link>
          </div>
        </div>
        <div className="student-focus-panel" aria-label="Lộ trình luyện nói hôm nay">
          <div className="student-focus-step is-active">
            <Target size={16} />
            <div>
              <strong>Mục tiêu</strong>
              <span>{completedToday}/{practiceGoal} lượt nói hôm nay</span>
            </div>
          </div>
          <div className="student-focus-step">
            <MessageSquareText size={16} />
            <div>
              <strong>Feedback gần nhất</strong>
              <span>{latestCompleted?.score !== null && latestCompleted?.score !== undefined ? `Điểm ${latestCompleted.score} · ${latestCompleted.topic.title}` : 'Chưa có buổi được chấm'}</span>
            </div>
          </div>
          <div className="student-focus-step">
            <Flame size={16} />
            <div>
              <strong>Streak</strong>
              <span>{streak > 0 ? `${streak} ngày liên tiếp` : 'Luyện hôm nay để bắt đầu streak'}</span>
            </div>
          </div>
        </div>
      </section>

      <div style={{ marginBottom: 32 }}>
        <StudentJoinClassForm />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatsCard icon={Mic} label="Tổng sessions" value={totalSessions} color="#2563EB" />
        <StatsCard icon={Clock} label="Tổng thời gian" value={formatDuration(totalDuration._sum.durationSec ?? 0)} color="#0F766E" />
        <StatsCard icon={Star} label="Điểm TB" value={avgScore._avg.score ? Math.round(avgScore._avg.score) : '—'} color="#D97706" />
        <StatsCard icon={Flame} label="Streak" value={`${streak} ngày`} color="#DC2626" />
        <Link href="/student/classes" style={{ textDecoration: 'none' }}>
          <StatsCard icon={BookOpen} label="Lớp học" value={enrollments} color="#16A34A" />
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={17} style={{ color: 'var(--primary)' }} /> Bài tập chờ làm
            </h2>
            <Link href="/student/assignments" style={{ textDecoration: 'none', fontSize: 12, color: 'var(--primary-light)' }}>Xem tất cả →</Link>
          </div>
          {pendingAssignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle size={32} style={{ color: '#10B981', display: 'block', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đã hoàn thành tất cả.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingAssignments.map(a => (
                <Link key={a.id} href={`/student/assignments/${a.id}/practice`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{a.topic.icon}</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.class.name} · {a.deadline ? `HH ${formatDate(a.deadline)}` : 'Không giới hạn'}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={17} style={{ color: 'var(--primary)' }} /> Lịch sử luyện tập
            </h2>
            <Link href="/student/sessions" style={{ textDecoration: 'none', fontSize: 12, color: 'var(--primary-light)' }}>Xem tất cả →</Link>
          </div>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Mic size={32} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chưa có session nào.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map(s => (
                <Link key={s.id} href={`/student/sessions/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{s.topic.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{s.topic.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(s.startedAt)} · {s.level}</p>
                    </div>
                    {s.score !== null && (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: s.score >= 80 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: s.score >= 80 ? '#10B981' : '#F59E0B' }}>{s.score}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={17} style={{ color: 'var(--primary)' }} /> Tỉ lệ hoàn thành
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{completedSessions}/{totalSessions} sessions</span>
        </div>
        <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}%`, background: 'var(--primary)' }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
