import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft, Users, ClipboardList, PlusCircle, Edit3, TrendingUp } from 'lucide-react';
import { ArchiveClassButton, CopyJoinCodeButton, RemoveStudentButton } from '@/components/TeacherClassActions';

export default async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      students: { include: { student: true } },
      assignments: {
        include: { topic: true, sessions: { where: { status: 'completed' } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!cls || (cls.teacherId !== session.user.id && session.user.role !== 'admin')) notFound();

  const classSessions = await prisma.session.findMany({
    where: { assignment: { classId: cls.id } },
    include: { student: true, topic: true, assignment: true },
    orderBy: { startedAt: 'desc' },
  });

  const studentProgress = new Map<string, {
    totalSessions: number;
    completedAssignments: Set<string>;
    scores: number[];
    lastActivity: Date | null;
  }>();

  for (const cs of cls.students) {
    studentProgress.set(cs.studentId, {
      totalSessions: 0,
      completedAssignments: new Set<string>(),
      scores: [],
      lastActivity: null,
    });
  }

  for (const practiceSession of classSessions) {
    const progress = studentProgress.get(practiceSession.studentId);
    if (!progress) continue;
    progress.totalSessions += 1;
    if (practiceSession.assignmentId && practiceSession.status === 'completed') {
      progress.completedAssignments.add(practiceSession.assignmentId);
    }
    if (practiceSession.score !== null) {
      progress.scores.push(practiceSession.score);
    }
    if (!progress.lastActivity || practiceSession.startedAt > progress.lastActivity) {
      progress.lastActivity = practiceSession.startedAt;
    }
  }

  const publishedAssignments = cls.assignments.filter(a => a.status === 'published').length;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 24 }}>
        <Link href="/teacher/classes" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Quay lại lớp học
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 4 }}>{cls.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cls.description || 'Không có mô tả'} {cls.level ? `· Level ${cls.level}` : ''}</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.22)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mã lớp</span>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1.5, color: '#06B6D4', fontFamily: 'Outfit, sans-serif' }}>{cls.joinCode}</span>
            <CopyJoinCodeButton joinCode={cls.joinCode} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={`/teacher/classes/${cls.id}/edit`} style={{ textDecoration: 'none' }}>
            <button style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.28)', background: 'rgba(124,58,237,0.08)', color: 'var(--primary-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={14} /> Sửa lớp
            </button>
          </Link>
          {cls.status !== 'archived' && <ArchiveClassButton classId={cls.id} />}
          <Link href={`/teacher/topics/new?classId=${cls.id}`} style={{ textDecoration: 'none' }}>
            <button style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.28)', background: 'rgba(6,182,212,0.08)', color: '#06B6D4', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={14} /> Tạo AI conversation
            </button>
          </Link>
          <Link href={`/teacher/assignments/create?classId=${cls.id}`} style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={14} /> Giao bài mới
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Students */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> Học viên ({cls.students.length})
          </h2>
          {cls.students.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Chưa có học viên nào.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cls.students.map(cs => (
                <div key={cs.id} style={{ padding: '12px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#10B981' }}>
                    {cs.student.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{cs.student.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cs.student.email}</p>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: cs.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: cs.status === 'active' ? '#10B981' : '#6B7280' }}>
                    {cs.status === 'active' ? 'Đang học' : 'Dừng'}
                  </span>
                  {cs.status === 'active' && <RemoveStudentButton classId={cls.id} studentId={cs.studentId} />}
                  </div>
                  {(() => {
                    const progress = studentProgress.get(cs.studentId);
                    const completed = progress?.completedAssignments.size ?? 0;
                    const avgScore = progress && progress.scores.length > 0
                      ? Math.round(progress.scores.reduce((sum, score) => sum + score, 0) / progress.scores.length)
                      : null;
                    const completionRate = publishedAssignments > 0 ? Math.round((completed / publishedAssignments) * 100) : 0;
                    return (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                          <div>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Bài xong</p>
                            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>{completed}/{publishedAssignments}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Lượt luyện</p>
                            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>{progress?.totalSessions ?? 0}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Điểm TB</p>
                            <p style={{ fontSize: 12, fontWeight: 800, color: avgScore !== null && avgScore >= 80 ? '#10B981' : 'var(--text-primary)' }}>{avgScore ?? '—'}</p>
                          </div>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${completionRate}%`, background: 'var(--gradient-primary)' }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignments */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={16} /> Bài tập ({cls.assignments.length})
          </h2>
          {cls.assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Chưa có bài tập nào.</p>
              <Link href={`/teacher/assignments/create?classId=${cls.id}`} style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>+ Giao bài đầu tiên</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cls.assignments.map(a => {
                const completionRate = cls.students.length > 0 ? Math.round((a.sessions.length / cls.students.length) * 100) : 0;
                return (
                  <div key={a.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{a.topic.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.topic.title} · {a.topic.level}</p>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: a.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: a.status === 'published' ? '#10B981' : '#6B7280' }}>
                        {a.status === 'published' ? 'Đang mở' : a.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hoàn thành: {a.sessions.length}/{cls.students.length}</span>
                      <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${completionRate}%`, background: 'var(--gradient-primary)', borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <Link href={`/teacher/assignments/${a.id}/edit`} style={{ textDecoration: 'none' }}>
                        <button style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)', color: 'var(--primary-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Edit3 size={12} /> Sửa
                        </button>
                      </Link>
                      <Link href={`/teacher/assignments/${a.id}`} style={{ textDecoration: 'none' }}>
                        <button style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)', color: '#06B6D4', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <TrendingUp size={12} /> Tiến độ
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
