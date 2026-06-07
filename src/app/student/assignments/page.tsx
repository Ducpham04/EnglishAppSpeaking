import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StudentJoinClassForm from '@/components/StudentJoinClassForm';
import Link from 'next/link';
import { Mic, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

function formatDate(d: Date | null) {
  if (!d) return 'Không giới hạn';
  const now = new Date();
  const deadline = new Date(d);
  const diff = deadline.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `Đã hết hạn`;
  if (days === 0) return 'Hết hạn hôm nay';
  if (days <= 3) return `Còn ${days} ngày`;
  return deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default async function StudentAssignments() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const studentId = session.user.id;

  const assignments = await prisma.assignment.findMany({
    where: {
      class: { status: 'active', students: { some: { studentId, status: 'active' } } },
      status: 'published',
    },
    include: {
      topic: true,
      class: true,
      sessions: { where: { studentId, status: 'completed' } },
    },
    orderBy: { deadline: 'asc' },
  });

  const completed = assignments.filter(a => a.sessions.length > 0);
  const pending = assignments.filter(a => a.sessions.length === 0);

  return (
    <DashboardLayout title="Bài tập của tôi">
      <div style={{ marginBottom: 24 }}>
        <StudentJoinClassForm />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Tổng bài tập', value: assignments.length, color: '#7C3AED' },
          { label: 'Chờ làm', value: pending.length, color: '#F59E0B' },
          { label: 'Đã hoàn thành', value: completed.length, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'Outfit, sans-serif' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {assignments.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Mic size={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Chưa có bài tập nào</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Giáo viên chưa giao bài. Bạn có thể luyện nói tự do.</p>
          <Link href="/demo"><button className="btn-primary" style={{ padding: '12px 28px' }}>🎙️ Luyện nói tự do</button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Pending */}
          {pending.length > 0 && (
            <>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)', marginBottom: 4 }}>⏳ Chờ làm</h2>
              {pending.map(a => {
                const dl = a.deadline ? new Date(a.deadline) : null;
                const overdue = dl && dl < new Date();
                const urgentDays = dl && !overdue && (dl.getTime() - new Date().getTime()) < 3 * 24 * 3600 * 1000;
                return (
                  <div key={a.id} className="glass-card" style={{ padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center', border: overdue ? '1px solid rgba(239,68,68,0.3)' : urgentDays ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize: 36 }}>{a.topic.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{a.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{a.class.name} · Level {a.topic.level}</p>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                          <Clock size={12} /> Tối thiểu {Math.round(a.minDurationSec / 60)} phút
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: overdue ? '#EF4444' : urgentDays ? '#F59E0B' : 'var(--text-muted)' }}>
                          {overdue ? <AlertCircle size={12} /> : <Clock size={12} />} {formatDate(a.deadline)}
                        </span>
                      </div>
                    </div>
                    <Link href={`/student/assignments/${a.id}/practice`} style={{ textDecoration: 'none' }}>
                      <button className="btn-primary" id={`start-assign-${a.id}`} style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mic size={14} /> Bắt đầu
                      </button>
                    </Link>
                  </div>
                );
              })}
            </>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 16 }}>✅ Đã hoàn thành</h2>
              {completed.map(a => (
                <div key={a.id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', opacity: 0.7 }}>
                  <span style={{ fontSize: 28 }}>{a.topic.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{a.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.class.name}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={16} style={{ color: '#10B981' }} />
                    <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>Hoàn thành</span>
                  </div>
                  <Link href={`/student/sessions/${a.sessions[0].id}`} style={{ textDecoration: 'none' }}>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
