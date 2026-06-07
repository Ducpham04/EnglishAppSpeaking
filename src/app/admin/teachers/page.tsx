import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, School, ClipboardList } from 'lucide-react';
import AdminSubscriptionForm from '@/components/AdminSubscriptionForm';

export default async function AdminTeachers() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  const [teachers, teacherPlans] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'teacher' },
      include: {
        teacherClasses: {
          include: { students: true, assignments: true },
        },
        subscriptions: {
          where: {
            status: { in: ['active', 'trialing'] },
            OR: [
              { endsAt: null },
              { endsAt: { gt: new Date() } },
            ],
          },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.plan.findMany({
      where: { role: 'teacher', isActive: true },
      orderBy: { priceVnd: 'asc' },
      select: { id: true, name: true, priceVnd: true },
    }),
  ]);

  return (
    <DashboardLayout title="Quản lý Giáo viên">
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Tổng: <strong style={{ color: 'var(--text-primary)' }}>{teachers.length}</strong> giáo viên</span>
      </div>

      {teachers.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Chưa có giáo viên nào.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Giáo viên', 'Email', 'Lớp học', 'Học viên', 'Bài tập', 'Gói hiện tại', 'Cấp gói'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => {
                const totalStudents = t.teacherClasses.reduce((s, c) => s + c.students.length, 0);
                const totalAssignments = t.teacherClasses.reduce((s, c) => s + c.assignments.length, 0);
                const activeSubscription = t.subscriptions[0];
                return (
                  <tr key={t.id} style={{ borderBottom: i < teachers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
                          {t.name[0]}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{t.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <School size={13} /> {t.teacherClasses.length}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Users size={13} /> {totalStudents}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <ClipboardList size={13} /> {totalAssignments}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: 150 }}>
                      {activeSubscription ? (
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                            {activeSubscription.plan.name}
                          </span>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                            {activeSubscription.endsAt ? `Hết hạn ${activeSubscription.endsAt.toLocaleDateString('vi-VN')}` : 'Không hạn'}
                          </p>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                          Chưa có gói
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <AdminSubscriptionForm userId={t.id} plans={teacherPlans} />
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
