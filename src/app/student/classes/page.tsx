import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StudentJoinClassForm from '@/components/StudentJoinClassForm';
import { BookOpen, CheckCircle2, ClipboardList, Clock, GraduationCap, Mail, Mic, UserRound } from 'lucide-react';

function formatDate(date: Date) {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isCompletedByStudent(assignment: { sessions: Array<{ status: string }> }) {
  return assignment.sessions.some(session => session.status === 'completed');
}

export default async function StudentClassesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'student' && session.user.role !== 'admin') redirect('/');

  const studentId = session.user.id;
  const enrollments = await prisma.classStudent.findMany({
    where: { studentId, status: 'active' },
    include: {
      class: {
        include: {
          teacher: { select: { name: true, email: true } },
          assignments: {
            where: { status: 'published' },
            include: {
              topic: true,
              sessions: {
                where: { studentId, status: { in: ['completed', 'active', 'needs_retry'] } },
                select: { id: true, status: true, score: true },
              },
            },
            orderBy: { deadline: 'asc' },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const activeEnrollments = enrollments.filter(item => item.class.status === 'active');
  const totalAssignments = activeEnrollments.reduce((sum, item) => sum + item.class.assignments.length, 0);
  const completedAssignments = activeEnrollments.reduce(
    (sum, item) => sum + item.class.assignments.filter(isCompletedByStudent).length,
    0
  );
  const pendingAssignments = totalAssignments - completedAssignments;

  return (
    <DashboardLayout title="Lớp học của tôi">
      <div style={{ marginBottom: 24 }}>
        <StudentJoinClassForm />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
        <SummaryCard icon={GraduationCap} label="Lớp đang học" value={activeEnrollments.length} color="#10B981" />
        <SummaryCard icon={ClipboardList} label="Tổng bài tập" value={totalAssignments} color="#7C3AED" />
        <SummaryCard icon={Clock} label="Chờ hoàn thành" value={pendingAssignments} color="#F59E0B" />
        <SummaryCard icon={CheckCircle2} label="Đã hoàn thành" value={completedAssignments} color="#06B6D4" />
      </div>

      {activeEnrollments.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Bạn chưa tham gia lớp nào</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Nhập mã lớp giáo viên gửi ở ô phía trên để nhận bài tập và theo dõi tiến độ theo lớp.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          {activeEnrollments.map(enrollment => {
            const assignments = enrollment.class.assignments;
            const classCompleted = assignments.filter(isCompletedByStudent);
            const classPending = assignments.filter(item => !isCompletedByStudent(item));
            const completionRate = assignments.length > 0 ? Math.round((classCompleted.length / assignments.length) * 100) : 0;

            return (
              <section key={enrollment.id} className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 18 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, color: 'var(--text-primary)', marginBottom: 3 }}>{enrollment.class.name}</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Tham gia ngày {formatDate(enrollment.joinedAt)} {enrollment.class.level ? `· Level ${enrollment.class.level}` : ''}
                        </p>
                      </div>
                    </div>
                    {enrollment.class.description ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 760 }}>{enrollment.class.description}</p>
                    ) : null}
                  </div>

                  <div style={{ display: 'grid', gap: 6, minWidth: 190, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <InfoLine icon={UserRound} text={enrollment.class.teacher.name} />
                    <InfoLine icon={Mail} text={enrollment.class.teacher.email} />
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mã lớp: <strong style={{ color: 'var(--text-primary)' }}>{enrollment.class.joinCode}</strong></p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
                  <MiniMetric label="Bài tập" value={assignments.length} />
                  <MiniMetric label="Chờ làm" value={classPending.length} tone="#F59E0B" />
                  <MiniMetric label="Hoàn thành" value={`${completionRate}%`} tone="#10B981" />
                </div>

                <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 18 }}>
                  <div style={{ width: `${completionRate}%`, height: '100%', borderRadius: 999, background: '#10B981' }} />
                </div>

                {assignments.length === 0 ? (
                  <div style={{ padding: 16, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: 13 }}>
                    Lớp này chưa có bài tập được giao.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {classPending.slice(0, 4).map(assignment => (
                      <Link key={assignment.id} href={`/student/assignments/${assignment.id}/practice`} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 24 }}>{assignment.topic.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{assignment.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {assignment.topic.title} · {assignment.deadline ? `Hạn ${formatDate(assignment.deadline)}` : 'Không giới hạn'}
                            </p>
                          </div>
                          <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Mic size={13} /> Luyện
                          </button>
                        </div>
                      </Link>
                    ))}
                    {classPending.length > 4 ? (
                      <Link href="/student/assignments" style={{ color: 'var(--primary-light)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                        Xem thêm {classPending.length - 4} bài đang chờ
                      </Link>
                    ) : null}
                    {classPending.length === 0 ? (
                      <div style={{ padding: 14, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', color: '#10B981', fontSize: 13, fontWeight: 700 }}>
                        Bạn đã hoàn thành tất cả bài tập trong lớp này.
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: typeof GraduationCap; label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        <Icon size={19} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{value}</p>
      </div>
    </div>
  );
}

function InfoLine({ icon: Icon, text }: { icon: typeof UserRound; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
      <Icon size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{text}</span>
    </div>
  );
}

function MiniMetric({ label, value, tone = 'var(--text-primary)' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 800, color: tone }}>{value}</p>
    </div>
  );
}
