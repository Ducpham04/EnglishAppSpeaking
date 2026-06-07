import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { checkUserUsageLimit } from '@/lib/usage-control';
import { getDaysUntil, getStudentPlanUsage, getTeacherPlanUsage } from '@/lib/subscriptions';
import { AlertTriangle, CalendarClock, CheckCircle2, Gauge, PackageCheck } from 'lucide-react';

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatDate(date: Date | null | undefined) {
  if (!date) return 'Không hạn';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function progressPercent(value: number, limit: number | null | undefined) {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((value / limit) * 100));
}

function UsageRow({ label, value, limit }: { label: string; value: number; limit?: number | null }) {
  const percent = progressPercent(value, limit);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>
          {formatNumber(value)}{limit ? ` / ${formatNumber(limit)}` : ''}
        </span>
      </div>
      {limit ? (
        <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', borderRadius: 999, background: percent >= 90 ? '#EF4444' : percent >= 75 ? '#F59E0B' : '#10B981' }} />
        </div>
      ) : null}
    </div>
  );
}

export default async function AccountPlanPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'admin') redirect('/admin/dashboard');
  const isTeacher = session.user.role === 'teacher';

  const [tokenUsage, planUsage] = await Promise.all([
    checkUserUsageLimit(session.user.id),
    isTeacher ? getTeacherPlanUsage(session.user.id) : getStudentPlanUsage(session.user.id),
  ]);
  const teacherUsage = isTeacher ? planUsage as Awaited<ReturnType<typeof getTeacherPlanUsage>> : null;

  const activeSubscription = planUsage.activeSubscription;
  const plan = activeSubscription?.plan ?? null;
  const daysUntilEnd = getDaysUntil(activeSubscription?.endsAt);
  const isExpiringSoon = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 7;

  return (
    <DashboardLayout title="Gói của tôi">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 18, alignItems: 'start' }}>
        <section className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gói hiện tại</p>
              <h2 style={{ fontSize: 28, color: 'var(--text-primary)', marginBottom: 8 }}>{plan?.name ?? 'Chưa có gói'}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 620 }}>
                {plan?.description ?? 'Tài khoản đang dùng hạn mức mặc định. Liên hệ admin để được cấp gói phù hợp.'}
              </p>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
              <PackageCheck size={22} />
            </div>
          </div>

          {activeSubscription ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
              <div style={metricStyle}>
                <CalendarClock size={16} style={{ color: '#8B5CF6' }} />
                <span style={metricLabelStyle}>Hết hạn</span>
                <strong style={metricValueStyle}>{formatDate(activeSubscription.endsAt)}</strong>
              </div>
              <div style={metricStyle}>
                <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                <span style={metricLabelStyle}>Trạng thái</span>
                <strong style={metricValueStyle}>{activeSubscription.status === 'trialing' ? 'Dùng thử' : 'Đang hoạt động'}</strong>
              </div>
              <div style={metricStyle}>
                <Gauge size={16} style={{ color: '#F59E0B' }} />
                <span style={metricLabelStyle}>Token hôm nay</span>
                <strong style={metricValueStyle}>{progressPercent(tokenUsage.dailyTokens, tokenUsage.dailyLimit)}%</strong>
              </div>
            </div>
          ) : null}

          {isExpiringSoon ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)', color: '#F59E0B', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
              <AlertTriangle size={16} />
              Gói sẽ hết hạn sau {daysUntilEnd} ngày. Vui lòng liên hệ admin để gia hạn.
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 16 }}>
            <UsageRow label="Token hôm nay" value={tokenUsage.dailyTokens} limit={tokenUsage.dailyLimit} />
            <UsageRow label="Token tháng này" value={tokenUsage.monthlyTokens} limit={tokenUsage.monthlyLimit} />
          </div>
        </section>

        <aside className="glass-card" style={{ padding: 20, display: 'grid', gap: 16 }}>
          <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>Giới hạn theo gói</h3>
          {teacherUsage ? (
            <>
              <UsageRow label="Lớp đang hoạt động" value={teacherUsage.activeClasses} limit={plan?.classLimit} />
              <UsageRow label="Học viên đang quản lý" value={teacherUsage.activeStudents} limit={plan?.studentLimit} />
              <UsageRow label="Bài tập đã tạo" value={teacherUsage.activeAssignments} limit={plan?.assignmentLimit} />
              <UsageRow label="Phiên luyện của lớp tháng này" value={teacherUsage.monthlySessions} limit={plan?.monthlySessionLimit} />
            </>
          ) : (
            <UsageRow label="Phiên luyện tháng này" value={planUsage.monthlySessions} limit={plan?.monthlySessionLimit} />
          )}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Việc nâng cấp/gia hạn đang được admin xử lý thủ công sau khi xác nhận thanh toán.
          </p>
        </aside>
      </div>
    </DashboardLayout>
  );
}

const metricStyle = {
  display: 'grid',
  gap: 6,
  padding: 14,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
};

const metricLabelStyle = {
  fontSize: 11,
  color: 'var(--text-muted)',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const metricValueStyle = {
  fontSize: 14,
  color: 'var(--text-primary)',
};
