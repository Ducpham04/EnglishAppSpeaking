import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { PlusCircle, Users, ChevronRight, School, ClipboardList } from 'lucide-react';

export default async function TeacherClasses() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') redirect('/');

  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    include: {
      students: { include: { student: true } },
      assignments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const LEVEL_COLORS: Record<string, string> = { A1: '#10B981', A2: '#06B6D4', B1: '#3B82F6', B2: '#8B5CF6', C1: '#EF4444', C2: '#F59E0B' };

  return (
    <DashboardLayout title="Lớp học của tôi">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <Link href="/teacher/classes/new" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" id="new-class-btn" style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={16} /> Tạo lớp mới
          </button>
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <School size={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Chưa có lớp học nào</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Tạo lớp học đầu tiên để bắt đầu giao bài cho học viên.</p>
          <Link href="/teacher/classes/new"><button className="btn-primary" style={{ padding: '12px 28px' }}>+ Tạo lớp học đầu tiên</button></Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {classes.map(c => {
            const levelColor = c.level ? (LEVEL_COLORS[c.level] || '#7C3AED') : '#7C3AED';
            const activeAssignments = c.assignments.filter(a => a.status === 'published').length;
            return (
              <div key={c.id} className="glass-card" style={{ padding: 24, position: 'relative' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${levelColor}15`, border: `1px solid ${levelColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏫</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>{c.name}</h3>
                    {c.level && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${levelColor}15`, color: levelColor }}>{c.level}</span>}
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: c.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: c.status === 'active' ? '#10B981' : '#6B7280' }}>
                    {c.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                  </span>
                </div>

                {c.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{c.description}</p>}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.16)', marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mã join cho học viên</span>
                  <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.2, color: '#06B6D4', fontFamily: 'Outfit, sans-serif' }}>{c.joinCode}</span>
                </div>

                <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <Users size={14} /> {c.students.length} học viên
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <ClipboardList size={14} /> {activeAssignments} bài tập
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Link href={`/teacher/classes/${c.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)', color: 'var(--primary-light)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      Quản lý <ChevronRight size={13} />
                    </button>
                  </Link>
                  <Link href={`/teacher/topics/new?classId=${c.id}`} style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)', color: '#06B6D4', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ AI</button>
                  </Link>
                  <Link href={`/teacher/assignments/create?classId=${c.id}`} style={{ textDecoration: 'none' }}>
                    <button className="btn-primary" style={{ padding: '10px 14px', fontSize: 13, whiteSpace: 'nowrap' }}>+ Giao bài</button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
