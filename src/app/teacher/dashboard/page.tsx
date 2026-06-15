import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import Link from 'next/link';
import { School, Users, ClipboardList, TrendingUp, ChevronRight, PlusCircle, Mic, Activity, AlertTriangle, CalendarClock } from 'lucide-react';
import { aggregateFeedbackNotes, average } from '@/lib/speaking-insights';

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  const teacherId = session.user.id;
  const now = new Date();

  const [classes, totalStudents, activeAssignments, recentSessions, insightSessions, upcomingAssignments] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId },
      include: { students: { include: { student: true } }, assignments: true },
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
    prisma.session.findMany({
      where: { assignment: { class: { teacherId } }, status: 'completed' },
      orderBy: { startedAt: 'desc' },
      take: 80,
      include: { student: true },
    }),
    prisma.assignment.findMany({
      where: {
        teacherId,
        status: 'published',
        deadline: { gte: now },
      },
      orderBy: { deadline: 'asc' },
      take: 5,
      include: { class: true, topic: true },
    }),
  ]);

  const completedSessions = await prisma.session.count({
    where: { assignment: { class: { teacherId } }, status: 'completed' },
  });
  const totalSessions = await prisma.session.count({
    where: { assignment: { class: { teacherId } } },
  });
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const feedbackSignals = aggregateFeedbackNotes(insightSessions);
  const students = new Map<string, { id: string; name: string; className: string }>();
  for (const cls of classes) {
    for (const enrollment of cls.students) {
      students.set(enrollment.studentId, {
        id: enrollment.studentId,
        name: enrollment.student.name,
        className: cls.name,
      });
    }
  }
  const atRiskStudents = Array.from(students.values()).map(student => {
    const studentSessions = insightSessions.filter(item => item.studentId === student.id);
    const lastSession = [...recentSessions, ...studentSessions].find(item => item.studentId === student.id);
    const avgScore = average(studentSessions.map(item => item.score));
    const inactiveDays = lastSession ? Math.floor((now.getTime() - lastSession.startedAt.getTime()) / 86_400_000) : null;
    const atRisk = studentSessions.length === 0 || (inactiveDays !== null && inactiveDays >= 7) || (avgScore !== null && avgScore < 60);
    return { ...student, avgScore, inactiveDays, atRisk };
  }).filter(item => item.atRisk).slice(0, 4);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
            Teacher workspace
          </p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', marginBottom: 6 }}>
            Xin chào, {session.user.name}
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
        <StatsCard icon={School} label="Lớp học" value={classes.length} color="#2563EB" />
        <StatsCard icon={Users} label="Học viên" value={totalStudents} color="#0F766E" />
        <StatsCard icon={ClipboardList} label="Bài tập đang mở" value={activeAssignments} color="#D97706" />
        <StatsCard icon={TrendingUp} label="Tỉ lệ hoàn thành" value={`${completionRate}%`} color="#16A34A" />
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ color: '#D97706' }} /> Class Command Center
          </h2>
          <Link href="/teacher/students" style={{ textDecoration: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 800 }}>Xem hồ sơ học viên →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(260px, 0.8fr)', gap: 16 }}>
          <section style={{ padding: 14, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 10 }}>Cần can thiệp</h3>
            {atRiskStudents.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chưa có học viên rủi ro rõ ràng.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {atRiskStudents.map(student => (
                  <Link key={student.id} href={`/teacher/students/${student.id}`} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
                    <span>{student.name} · {student.className}</span>
                    <strong style={{ color: student.avgScore !== null && student.avgScore < 60 ? '#DC2626' : '#D97706' }}>{student.avgScore ?? 'new'}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section style={{ padding: 14, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 10 }}>Tín hiệu lớp</h3>
            <Signal label="Dùng nhiều tiếng Việt" value={feedbackSignals.tooMuchVietnamese} />
            <Signal label="Lệch chủ đề" value={feedbackSignals.offTopic} />
            <Signal label="Improvement nổi bật" value={feedbackSignals.improvements[0]?.count ?? 0} text={feedbackSignals.improvements[0]?.label ?? 'Chưa đủ dữ liệu'} />
          </section>

          <section style={{ padding: 14, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarClock size={15} /> Deadline gần
            </h3>
            {upcomingAssignments.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Không có bài sắp hạn.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {upcomingAssignments.map(item => (
                  <Link key={item.id} href={`/teacher/assignments/${item.id}`} style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 13 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{item.title}</strong>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.class.name} · {item.deadline?.toLocaleDateString('vi-VN') ?? ''}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Classes list */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <School size={17} style={{ color: 'var(--primary)' }} /> Lớp học của tôi
            </h2>
            <Link href="/teacher/classes" style={{ textDecoration: 'none', fontSize: 12, color: 'var(--primary-light)' }}>Xem tất cả →</Link>
          </div>
          {classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Chưa có lớp học nào.</p>
              <Link href="/teacher/classes"><button className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Tạo lớp mới</button></Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {classes.slice(0, 4).map(c => (
                <Link key={c.id} href={`/teacher/classes/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px 16px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <School size={17} style={{ color: 'var(--primary)' }} />
                    </div>
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
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={17} style={{ color: 'var(--primary)' }} /> Hoạt động gần đây
          </h2>
          {recentSessions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Chưa có hoạt động nào.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSessions.map(s => (
                <div key={s.id} style={{ padding: '10px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0F766E' }}>
                    {s.student.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{s.student.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.topic.title} · {s.topic.icon}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {s.score !== null && <p style={{ fontSize: 13, fontWeight: 700, color: s.score >= 80 ? '#16A34A' : '#D97706' }}>{s.score}pts</p>}
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: s.status === 'completed' ? '#DCFCE7' : '#FEF3C7', color: s.status === 'completed' ? '#166534' : '#92400E' }}>
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

function Signal({ label, value, text }: { label: string; value: number; text?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid #E5E7EB' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{text ?? label}</span>
      <strong style={{ fontSize: 12, color: value > 0 ? '#D97706' : '#16A34A' }}>{value}</strong>
    </div>
  );
}
