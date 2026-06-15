import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { checkUserUsageLimit } from '@/lib/usage-control';
import { getDaysUntil, getStudentPlanUsage, getTeacherPlanUsage } from '@/lib/subscriptions';
import { prisma } from '@/lib/prisma';
import { formatVnd, getPaymentConfig } from '@/lib/payment';
import { AlertTriangle, CalendarClock, CheckCircle2, Copy, CreditCard, Gauge, PackageCheck, QrCode } from 'lucide-react';

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
  const payment = getPaymentConfig();

  const [tokenUsage, planUsage, availablePlans] = await Promise.all([
    checkUserUsageLimit(session.user.id),
    isTeacher ? getTeacherPlanUsage(session.user.id) : getStudentPlanUsage(session.user.id),
    prisma.plan.findMany({
      where: { role: isTeacher ? 'teacher' : 'student', isActive: true },
      orderBy: { priceVnd: 'asc' },
    }),
  ]);
  const teacherUsage = isTeacher ? planUsage as Awaited<ReturnType<typeof getTeacherPlanUsage>> : null;

  const activeSubscription = planUsage.activeSubscription;
  const plan = activeSubscription?.plan ?? null;
  const daysUntilEnd = getDaysUntil(activeSubscription?.endsAt);
  const isExpiringSoon = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 7;

  return (
    <DashboardLayout title="Gói của tôi">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 18, alignItems: 'start', marginBottom: 18 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.7fr)', gap: 18, alignItems: 'start' }}>
        <section className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <CreditCard size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800 }}>Chọn gói nâng cấp</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Chuyển khoản đúng nội dung để admin đối soát và cấp gói nhanh hơn.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            {availablePlans.map(planOption => {
              const features = parseFeatures(planOption.featuresJson);
              const selected = planOption.id === plan?.id;
              return (
                <div key={planOption.id} style={{
                  padding: 18,
                  borderRadius: 8,
                  border: `1px solid ${selected ? 'rgba(37,99,235,0.38)' : '#E5E7EB'}`,
                  background: selected ? '#EFF6FF' : '#FFFFFF',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <h3 style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 850 }}>{planOption.name}</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }}>{planOption.description}</p>
                    </div>
                    {selected ? (
                      <span style={{ fontSize: 10, fontWeight: 850, color: '#2563EB', background: '#DBEAFE', border: '1px solid #BFDBFE', borderRadius: 6, padding: '4px 7px', whiteSpace: 'nowrap' }}>
                        Đang dùng
                      </span>
                    ) : null}
                  </div>
                  <p style={{ fontSize: 24, fontFamily: 'Outfit, sans-serif', fontWeight: 850, color: 'var(--primary-dark)', marginBottom: 12 }}>
                    {formatVnd(planOption.priceVnd)}
                    {planOption.priceVnd > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}> / tháng</span>}
                  </p>
                  <ul style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
                    {features.map(feature => (
                      <li key={feature} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <QrCode size={19} style={{ color: '#0F766E' }} />
            <h2 style={{ fontSize: 17, color: 'var(--text-primary)', fontWeight: 850 }}>Thanh toán QR</h2>
          </div>

          {payment.qrImageUrl ? (
            <div style={{ padding: 12, borderRadius: 8, border: '1px solid #E5E7EB', background: '#FFFFFF', marginBottom: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={payment.qrImageUrl} alt="Mã QR thanh toán GB Speaking AI" style={{ width: '100%', borderRadius: 6, display: 'block' }} />
            </div>
          ) : (
            <div style={{ minHeight: 220, borderRadius: 8, border: '1px dashed #CBD5E1', background: '#F8FAFC', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20, marginBottom: 14 }}>
              <div>
                <QrCode size={42} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>Admin chưa cấu hình ảnh QR thanh toán.</p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 9, marginBottom: 14 }}>
            <PaymentInfo label="Ngân hàng" value={payment.bankName || 'Chưa cấu hình'} />
            <PaymentInfo label="Chủ tài khoản" value={payment.accountName || 'Chưa cấu hình'} />
            <PaymentInfo label="Số tài khoản" value={payment.accountNumber || 'Chưa cấu hình'} />
          </div>

          <div style={{ padding: 12, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 850, textTransform: 'uppercase', marginBottom: 6 }}>Nội dung chuyển khoản</p>
            <p style={{ fontSize: 14, color: 'var(--primary-dark)', fontWeight: 850, wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Copy size={14} />
              {payment.notePrefix} {session.user.id.slice(-6).toUpperCase()}
            </p>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{payment.contactText}</p>
        </aside>
      </div>
    </DashboardLayout>
  );
}

function parseFeatures(featuresJson: string | null) {
  if (!featuresJson) return ['Hạn mức theo cấu hình gói'];
  try {
    const parsed = JSON.parse(featuresJson);
    return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : ['Hạn mức theo cấu hình gói'];
  } catch {
    return ['Hạn mức theo cấu hình gói'];
  }
}

function PaymentInfo({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 8, borderBottom: '1px solid #E5E7EB' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <strong style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'right' }}>{value}</strong>
    </div>
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
