import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import StudentJoinClassForm from '@/components/StudentJoinClassForm';
import Link from 'next/link';
import { Mic, Clock, Star, Flame, CheckCircle, ChevronRight, BookOpen } from 'lucide-react';

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

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', marginBottom: 6 }}>
          Xin chào, {session.user.name}! 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Hôm nay bạn muốn luyện nói chủ đề gì?</p>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(6,182,212,0.1) 100%)',
        border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16,
        padding: '24px 28px', marginBottom: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>🎙️ Luyện nói tự do</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Chọn topic bất kỳ và bắt đầu ngay, không cần bài tập</p>
        </div>
        <Link href="/demo" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" id="quick-practice-btn" style={{ padding: '12px 24px', fontSize: 14, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mic size={16} /> Luyện ngay
          </button>
        </Link>
      </div>

      <div style={{ marginBottom: 32 }}>
        <StudentJoinClassForm />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatsCard icon={Mic} label="Tổng sessions" value={totalSessions} color="#7C3AED" />
        <StatsCard icon={Clock} label="Tổng thời gian" value={formatDuration(totalDuration._sum.durationSec ?? 0)} color="#06B6D4" />
        <StatsCard icon={Star} label="Điểm TB" value={avgScore._avg.score ? Math.round(avgScore._avg.score) : '—'} color="#F59E0B" />
        <StatsCard icon={Flame} label="Streak" value={`${streak} ngày`} color="#EF4444" />
        <Link href="/student/classes" style={{ textDecoration: 'none' }}>
          <StatsCard icon={BookOpen} label="Lớp học" value={enrollments} color="#10B981" />
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>📋 Bài tập chờ làm</h2>
            <Link href="/student/assignments" style={{ textDecoration: 'none', fontSize: 12, color: 'var(--primary-light)' }}>Xem tất cả →</Link>
          </div>
          {pendingAssignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle size={32} style={{ color: '#10B981', display: 'block', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đã hoàn thành tất cả! 🎉</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingAssignments.map(a => (
                <Link key={a.id} href={`/student/assignments/${a.id}/practice`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>🕐 Lịch sử luyện tập</h2>
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
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>📊 Tỉ lệ hoàn thành</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{completedSessions}/{totalSessions} sessions</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}%`, background: 'var(--gradient-primary)' }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
