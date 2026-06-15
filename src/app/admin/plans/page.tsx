import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import { prisma } from '@/lib/prisma';
import { formatVnd, getPaymentConfig } from '@/lib/payment';
import { CreditCard, QrCode, Users, AlertTriangle, CheckCircle2, CalendarClock } from 'lucide-react';

function parseFeatures(featuresJson: string | null) {
  if (!featuresJson) return [];
  try {
    const parsed = JSON.parse(featuresJson);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function formatDate(date: Date | null) {
  if (!date) return 'Không hạn';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function AdminPlansPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  const payment = await getPaymentConfig();
  const now = new Date();
  const [plans, activeSubscriptions, recentSubscriptions] = await Promise.all([
    prisma.plan.findMany({
      orderBy: [{ role: 'asc' }, { priceVnd: 'asc' }],
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    }),
    prisma.subscription.groupBy({
      by: ['planId'],
      where: {
        status: { in: ['active', 'trialing'] },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      _count: { id: true },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        plan: true,
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
      },
    }),
  ]);

  const activeMap = Object.fromEntries(activeSubscriptions.map(item => [item.planId, item._count.id]));
  const totalActive = activeSubscriptions.reduce((sum, item) => sum + item._count.id, 0);
  const paidPlans = plans.filter(plan => plan.priceVnd > 0 && plan.isActive).length;
  const qrReady = Boolean(payment.qrImageUrl && payment.bankName && payment.accountName && payment.accountNumber);

  return (
    <DashboardLayout title="Quản lý gói">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatsCard icon={CreditCard} label="Tổng gói" value={plans.length} color="#2563EB" />
        <StatsCard icon={Users} label="Thuê bao active" value={totalActive} color="#10B981" />
        <StatsCard icon={CreditCard} label="Gói trả phí" value={paidPlans} color="#F59E0B" />
        <StatsCard icon={qrReady ? CheckCircle2 : AlertTriangle} label="QR thanh toán" value={qrReady ? 'Đã cấu hình' : 'Thiếu'} color={qrReady ? '#10B981' : '#EF4444'} />
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <QrCode size={18} style={{ color: qrReady ? '#10B981' : '#EF4444' }} />
              <h2 style={{ fontSize: 17, color: 'var(--text-primary)', fontWeight: 850 }}>Cấu hình thanh toán QR</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Trang tài khoản sẽ hiển thị QR khi đủ các biến env: `NEXT_PUBLIC_PAYMENT_QR_IMAGE_URL`,
              `NEXT_PUBLIC_PAYMENT_BANK_NAME`, `NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME`, `NEXT_PUBLIC_PAYMENT_ACCOUNT_NUMBER`.
            </p>
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 850,
            borderRadius: 8,
            padding: '7px 10px',
            background: qrReady ? '#ECFDF5' : '#FEF2F2',
            color: qrReady ? '#047857' : '#DC2626',
            border: `1px solid ${qrReady ? '#BBF7D0' : '#FECACA'}`,
            whiteSpace: 'nowrap',
          }}>
            {qrReady ? 'Sẵn sàng nhận thanh toán' : 'Chưa sẵn sàng'}
          </span>
        </div>
      </div>

      <section className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 850, marginBottom: 16 }}>Danh sách gói</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {plans.map(plan => {
            const features = parseFeatures(plan.featuresJson);
            return (
              <article key={plan.id} style={{ padding: 18, borderRadius: 8, border: '1px solid #E5E7EB', background: plan.isActive ? '#FFFFFF' : '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 850, color: 'var(--text-primary)' }}>{plan.name}</h3>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{plan.code} · {plan.role}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 850, borderRadius: 6, padding: '4px 7px', background: plan.isActive ? '#ECFDF5' : '#F3F4F6', color: plan.isActive ? '#047857' : '#6B7280' }}>
                    {plan.isActive ? 'Active' : 'Tắt'}
                  </span>
                </div>
                <p style={{ fontSize: 24, color: 'var(--primary-dark)', fontFamily: 'Outfit, sans-serif', fontWeight: 850, marginBottom: 8 }}>{formatVnd(plan.priceVnd)}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>{plan.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <Metric label="Active" value={activeMap[plan.id] ?? 0} />
                  <Metric label="Tổng cấp" value={plan._count.subscriptions} />
                  <Metric label="Phiên/tháng" value={plan.monthlySessionLimit ?? '∞'} />
                  <Metric label="Token/tháng" value={plan.monthlyTokenLimit.toLocaleString('vi-VN')} />
                  {plan.role !== 'student' ? <Metric label="Lớp" value={plan.classLimit ?? '∞'} /> : null}
                  {plan.role !== 'student' ? <Metric label="Học viên" value={plan.studentLimit ?? '∞'} /> : null}
                </div>
                {features.length > 0 ? (
                  <ul style={{ listStyle: 'none', display: 'grid', gap: 6 }}>
                    {features.map(feature => (
                      <li key={feature} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        <CheckCircle2 size={13} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarClock size={18} style={{ color: '#8B5CF6' }} />
          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 850 }}>Lịch sử cấp gói gần đây</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              {['Thành viên', 'Role', 'Gói', 'Trạng thái', 'Hết hạn', 'Ghi chú'].map(head => (
                <th key={head} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 850, textTransform: 'uppercase' }}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentSubscriptions.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: index < recentSubscriptions.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <td style={{ padding: '13px 16px' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 750 }}>{item.user.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{item.user.email ?? item.user.phone ?? item.user.id}</p>
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{item.user.role}</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-primary)', fontWeight: 750 }}>{item.plan.name}</td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 850, padding: '3px 7px', borderRadius: 6, background: item.status === 'active' ? '#ECFDF5' : '#F3F4F6', color: item.status === 'active' ? '#047857' : '#6B7280' }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(item.endsAt)}</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 260 }}>{item.paymentNote || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: 10, borderRadius: 7, background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 850, textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 850 }}>{value}</p>
    </div>
  );
}
