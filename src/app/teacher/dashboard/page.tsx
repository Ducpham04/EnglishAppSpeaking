import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import Link from 'next/link';
import { School, Users, ClipboardList, TrendingUp, ChevronRight, PlusCircle, Mic } from 'lucide-react';

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  const teacherId = session.user.id;

  const [classes, totalStudents, activeAssignments, recentSessions] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId },
      include: { students: true, assignments: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classStudent.count({ where: { class: { teacherId } } }),
    prisma.assignment.count({ where: { teacherId, status: 'published' } }),
    prisma.session.findMany({
      where: { assignment: { class: { teacherId } } },
      orderBy: { startedAt: 'desc' },
      take: 8,
      include: { topic: true, student: true },
    }),
  ]);

  const completedSessions = await prisma.session.count({
    where: { assignment: { class: { teacherId } }, status: 'completed' },
  });
  const totalSessions = await prisma.session.count({
    where: { assignment: { class: { teacherId } } },
  });
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', marginBottom: 6 }}>
            Xin chào, {session.user.name}! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Quản lý lớp học và theo dõi tiến độ học viên</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/teacher/classes" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <School size={14} /> Quản lý lớp
            </button>
          </Link>
          <Link href="/teacher/assignments/create" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" id="create-assign-btn" style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={14} /> Giao bài mới
            </button>
          </Link>
          <Link href="/teacher/topics" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mic size={14} /> Hội thoại AI
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatsCard icon={School} label="Lớp học" value={classes.length} color="#7C3AED" />
        <StatsCard icon={Users} label="Học viên" value={totalStudents} color="#06B6D4" />
        <StatsCard icon={ClipboardList} label="Bài tập đang mở" value={activeAssignments} color="#F59E0B" />
        <StatsCard icon={TrendingUp} label="Tỉ lệ hoàn thành" value={`${completionRate}%`} color="#10B981" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Classes list */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>🏫 Lớp học của tôi</h2>
            <Link href="/teacher/classes" style={{ textDecoration: 'none', fontSize: 12, color: 'var(--primary-light)' }}>Xem tất cả →</Link>
          </div>
          {classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Chưa có lớp học nào.</p>
              <Link href="/teacher/classes"><button className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>+ Tạo lớp mới</button></Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {classes.slice(0, 4).map(c => (
                <Link key={c.id} href={`/teacher/classes/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏫</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.students.length} học viên · {c.level || 'All levels'}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 20 }}>🕐 Hoạt động gần đây</h2>
          {recentSessions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Chưa có hoạt động nào.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSessions.map(s => (
                <div key={s.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#06B6D4' }}>
                    {s.student.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{s.student.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.topic.title} · {s.topic.icon}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {s.score !== null && <p style={{ fontSize: 13, fontWeight: 700, color: s.score >= 80 ? '#10B981' : '#F59E0B' }}>{s.score}pts</p>}
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: s.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: s.status === 'completed' ? '#10B981' : '#F59E0B' }}>
                      {s.status === 'completed' ? 'Xong' : 'Đang làm'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
