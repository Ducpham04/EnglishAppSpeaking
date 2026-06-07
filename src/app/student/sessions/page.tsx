import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Mic, Clock, Star, ChevronRight } from 'lucide-react';

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}p ${s}s`;
}

export default async function StudentSessions() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sessions = await prisma.session.findMany({
    where: { studentId: session.user.id },
    orderBy: { startedAt: 'desc' },
    include: { topic: true, assignment: { include: { class: true } } },
  });

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    completed: { label: 'Hoàn thành', color: '#10B981' },
    active: { label: 'Đang làm', color: '#F59E0B' },
    cancelled: { label: 'Đã huỷ', color: '#6B7280' },
  };

  return (
    <DashboardLayout title="Lịch sử luyện tập">
      {sessions.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Mic size={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Chưa có lịch sử</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Bắt đầu luyện nói để xem lịch sử tại đây.</p>
          <Link href="/demo"><button className="btn-primary" style={{ padding: '12px 28px' }}>🎙️ Luyện ngay</button></Link>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Chủ đề', 'Level', 'Ngày', 'Thời gian', 'Lượt nói', 'Điểm', 'Trạng thái', ''].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const st = STATUS_LABEL[s.status] ?? { label: s.status, color: '#6B7280' };
                return (
                  <tr key={s.id} style={{ borderBottom: i < sessions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{s.topic.icon}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{s.topic.title}</p>
                          {s.assignment && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.assignment.class.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(124,58,237,0.15)', color: 'var(--primary-light)' }}>{s.level}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(s.startedAt)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Clock size={12} /> {formatDuration(s.durationSec)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.totalUserMessages}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {s.score !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={12} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.score}</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: `${st.color}15`, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/student/sessions/${s.id}`} style={{ textDecoration: 'none' }}>
                        <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                          <ChevronRight size={14} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
