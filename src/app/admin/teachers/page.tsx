import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, School, ClipboardList } from 'lucide-react';
import AdminSubscriptionForm from '@/components/AdminSubscriptionForm';
import AdminPasswordResetForm from '@/components/AdminPasswordResetForm';
import { getDaysUntil } from '@/lib/subscriptions';

export default async function AdminTeachers({ searchParams }: { searchParams?: Promise<{ plan?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');
  const params = await searchParams;
  const planFilter = params?.plan ?? 'all';

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
  const filteredTeachers = teachers.filter(teacher => {
    const activeSubscription = teacher.subscriptions[0];
    if (planFilter === 'no-plan') return !activeSubscription;
    if (planFilter === 'expiring') {
      const days = getDaysUntil(activeSubscription?.endsAt);
      return days !== null && days >= 0 && days <= 7;
    }
    return true;
  });
  const filters = [
    { href: '/admin/teachers', label: 'Tất cả', active: planFilter === 'all' },
    { href: '/admin/teachers?plan=no-plan', label: 'Chưa có gói', active: planFilter === 'no-plan' },
    { href: '/admin/teachers?plan=expiring', label: 'Sắp hết hạn', active: planFilter === 'expiring' },
  ];

  return (
    <DashboardLayout title="Quản lý Giáo viên">
      <div className="admin-list-toolbar" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Hiển thị: <strong style={{ color: 'var(--text-primary)' }}>{filteredTeachers.length}</strong> / {teachers.length} giáo viên</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filters.map(filter => (
            <Link key={filter.href} href={filter.href} style={{
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 800,
              padding: '8px 10px',
              borderRadius: 7,
              border: `1px solid ${filter.active ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.08)'}`,
              background: filter.active ? 'rgba(124,58,237,0.14)' : 'rgba(255,255,255,0.03)',
              color: filter.active ? 'var(--primary-light)' : 'var(--text-secondary)',
            }}>{filter.label}</Link>
          ))}
        </div>
      </div>

      {filteredTeachers.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Không có giáo viên phù hợp bộ lọc.</p>
        </div>
      ) : (
        <div className="glass-card admin-table-card">
          <div className="admin-table-scroll">
          <table style={{ width: '100%', minWidth: 1360, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Giáo viên', 'Email', 'Lớp học', 'Học viên', 'Bài tập', 'Gói hiện tại', 'Mật khẩu', 'Cấp gói'].map((h, index, list) => (
                  <th key={h} className={index === list.length - 1 ? 'admin-action-col' : undefined} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((t, i) => {
                const totalStudents = t.teacherClasses.reduce((s, c) => s + c.students.length, 0);
                const totalAssignments = t.teacherClasses.reduce((s, c) => s + c.assignments.length, 0);
                const activeSubscription = t.subscriptions[0];
                return (
                  <tr key={t.id} style={{ borderBottom: i < filteredTeachers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '14px 16px', minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
                          {t.name[0]}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>{t.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', minWidth: 220 }}>{t.email ?? t.phone ?? '—'}</td>
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
                    <td style={{ padding: '14px 16px', minWidth: 250 }}>
                      <AdminPasswordResetForm userId={t.id} />
                    </td>
                    <td className="admin-action-col" style={{ padding: '14px 16px' }}>
                      <AdminSubscriptionForm userId={t.id} plans={teacherPlans} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
