import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Users, TrendingUp, Award, Clock } from 'lucide-react';

export default async function TeacherStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  const teacherId = session.user.id;

  // Get all students enrolled in teacher's classes
  const [students, totalClasses] = await Promise.all([
    prisma.classStudent.findMany({
      where: {
        class: { teacherId },
      },
      include: {
        student: true,
        class: true,
      },
      orderBy: {
        student: { name: 'asc' },
      },
    }),
    prisma.class.count({
      where: { teacherId },
    }),
  ]);

  // Get stats for each student
  const studentStats = await Promise.all(
    students.map(async (enrollment) => {
      const [sessions, avgScore, recentSession] = await Promise.all([
        prisma.session.count({
          where: {
            studentId: enrollment.student.id,
            assignment: { class: { teacherId } },
          },
        }),
        prisma.session.aggregate({
          where: {
            studentId: enrollment.student.id,
            assignment: { class: { teacherId } },
            score: { not: null },
          },
          _avg: {
            score: true,
          },
        }),
        prisma.session.findFirst({
          where: {
            studentId: enrollment.student.id,
            assignment: { class: { teacherId } },
          },
          orderBy: { startedAt: 'desc' },
          include: { topic: true },
        }),
      ]);

      return {
        ...enrollment.student,
        className: enrollment.class.name,
        totalSessions: sessions,
        avgScore: avgScore._avg.score ? Math.round(avgScore._avg.score) : null,
        recentTopic: recentSession?.topic.title,
        lastActivity: recentSession?.startedAt,
      };
    })
  );

  return (
    <DashboardLayout title="Học viên">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} style={{ color: '#3B82F6' }} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', margin: 0 }}>
            Học viên
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {studentStats.length} học viên trong {totalClasses} lớp học
          </p>
        </div>
      </div>

      {studentStats.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Chưa có học viên nào trong các lớp của bạn.</p>
          <Link href="/teacher/classes" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Tạo lớp mới</button>
          </Link>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Tên học viên', 'Lớp', 'Bài luyện', 'Điểm TB', 'Chủ đề gần đây', 'Hoạt động'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '14px 18px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentStats.map((student, index) => (
                <tr
                  key={student.id}
                  style={{
                    borderBottom:
                      index < studentStats.length - 1
                        ? '1px solid rgba(255,255,255,0.06)'
                        : 'none',
                  }}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'var(--gradient-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'white',
                        }}
                      >
                        {student.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {student.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {student.className}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                      {student.totalSessions}
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {student.avgScore !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Award size={14} style={{ color: '#F59E0B' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {student.avgScore}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {student.recentTopic ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{student.recentTopic}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chưa có</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {student.lastActivity ? (
                      <span>
                        {new Date(student.lastActivity).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
