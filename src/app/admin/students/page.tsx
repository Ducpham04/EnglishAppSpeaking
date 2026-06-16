import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Mic, Star } from 'lucide-react';
import AdminSubscriptionForm from '@/components/AdminSubscriptionForm';
import AdminPasswordResetForm from '@/components/AdminPasswordResetForm';
import { getDaysUntil } from '@/lib/subscriptions';

export default async function AdminStudents({ searchParams }: { searchParams?: Promise<{ plan?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');
  const params = await searchParams;
  const planFilter = params?.plan ?? 'all';

  const [students, studentPlans] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'student' },
      include: {
        enrollments: { include: { class: true } },
        sessions: { orderBy: { startedAt: 'desc' }, take: 1 },
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
      where: { role: 'student', isActive: true },
      orderBy: { priceVnd: 'asc' },
      select: { id: true, name: true, priceVnd: true },
    }),
  ]);

  const sessionCounts = await prisma.session.groupBy({
    by: ['studentId'],
    _count: { id: true },
    _avg: { score: true },
  });
  const statsMap = Object.fromEntries(sessionCounts.map(s => [s.studentId, s]));
  const filteredStudents = students.filter(student => {
    const activeSubscription = student.subscriptions[0];
    if (planFilter === 'no-plan') return !activeSubscription;
    if (planFilter === 'expiring') {
      const days = getDaysUntil(activeSubscription?.endsAt);
      return days !== null && days >= 0 && days <= 7;
    }
    return true;
  });
  const filters = [
    { href: '/admin/students', label: 'Tất cả', active: planFilter === 'all' },
    { href: '/admin/students?plan=no-plan', label: 'Chưa có gói', active: planFilter === 'no-plan' },
    { href: '/admin/students?plan=expiring', label: 'Sắp hết hạn', active: planFilter === 'expiring' },
  ];

  return (
    <DashboardLayout title="Quản lý Học viên">
      <div className="admin-list-toolbar" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Hiển thị: <strong style={{ color: 'var(--text-primary)' }}>{filteredStudents.length}</strong> / {students.length} học viên</span>
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

      {filteredStudents.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Không có học viên phù hợp bộ lọc.</p>
        </div>
      ) : (
        <div className="glass-card admin-table-card">
          <div className="admin-table-scroll">
          <table style={{ width: '100%', minWidth: 1560, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Học viên', 'Email', 'Lớp học', 'Sessions', 'Điểm TB', 'Hoạt động gần nhất', 'Gói hiện tại', 'Trạng thái', 'Mật khẩu', 'Cấp gói'].map((h, index, list) => (
                  <th key={h} className={index === list.length - 1 ? 'admin-action-col' : undefined} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, i) => {
                const stats = statsMap[s.id];
                const lastSession = s.sessions[0];
                const avgScore = stats?._avg.score ? Math.round(stats._avg.score) : null;
                const activeSubscription = s.subscriptions[0];
                return (
                  <tr key={s.id} style={{ borderBottom: i < filteredStudents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '14px 16px', minWidth: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#10B981', flexShrink: 0 }}>
                          {s.name[0]}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', minWidth: 220 }}>{s.email ?? s.phone ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', minWidth: 190, lineHeight: 1.45 }}>
                      {s.enrollments.length > 0
                        ? s.enrollments.map(e => e.class.name).join(', ')
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Mic size={13} /> {stats?._count.id ?? 0}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {avgScore !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={12} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: avgScore >= 80 ? '#10B981' : avgScore >= 60 ? '#F59E0B' : '#EF4444' }}>{avgScore}</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {lastSession
                        ? new Date(lastSession.startedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '—'}
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
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: s.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: s.status === 'active' ? '#10B981' : '#EF4444' }}>
                        {s.status === 'active' ? 'Hoạt động' : s.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: 250 }}>
                      <AdminPasswordResetForm userId={s.id} />
                    </td>
                    <td className="admin-action-col" style={{ padding: '14px 16px' }}>
                      <AdminSubscriptionForm userId={s.id} plans={studentPlans} />
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
