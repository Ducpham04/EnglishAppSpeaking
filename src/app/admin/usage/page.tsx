import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import { BarChart2, Cpu, Layers, Shield, Zap } from 'lucide-react';
import { getUsageLimits } from '@/lib/usage-control';

export default async function AdminUsage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  const limits = getUsageLimits();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [usageLogCount, totalInputTokens, totalOutputTokens, totalCost, todayUsage, monthUsage, usageByModel, recentLogs] = await Promise.all([
    prisma.aiUsageLog.count(),
    prisma.aiUsageLog.aggregate({ _sum: { inputTokens: true } }).then(r => r._sum.inputTokens ?? 0),
    prisma.aiUsageLog.aggregate({ _sum: { outputTokens: true } }).then(r => r._sum.outputTokens ?? 0),
    prisma.aiUsageLog.aggregate({ _sum: { estimatedCost: true } }).then(r => r._sum.estimatedCost ?? 0),
    prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
    }),
    prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
    }),
    prisma.aiUsageLog.groupBy({
      by: ['provider', 'model'],
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
      _count: { _all: true },
      orderBy: { _sum: { estimatedCost: 'desc' } },
      take: 10,
    }),
    prisma.aiUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const todayTokens = (todayUsage._sum.inputTokens ?? 0) + (todayUsage._sum.outputTokens ?? 0);
  const monthTokens = (monthUsage._sum.inputTokens ?? 0) + (monthUsage._sum.outputTokens ?? 0);

  return (
    <DashboardLayout title="AI Usage">
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Tổng số log: <strong style={{ color: 'var(--text-primary)' }}>{usageLogCount}</strong>
        </span>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatsCard icon={BarChart2} label="Số bản ghi AI" value={usageLogCount} color="#7C3AED" />
        <StatsCard icon={Zap} label="Tổng token tiêu hao" value={totalTokens.toLocaleString()} color="#EF4444" />
        <StatsCard icon={Cpu} label="Input tokens" value={totalInputTokens.toLocaleString()} color="#06B6D4" />
        <StatsCard icon={Layers} label="Output tokens" value={totalOutputTokens.toLocaleString()} color="#10B981" />
        <StatsCard icon={Shield} label="Chi phí ước tính" value={`$${totalCost.toFixed(4)}`} color="#F59E0B" />
      </div>

      <div className="glass-card" style={{ padding: 24, marginTop: 24 }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 16 }}>Quota thương mại</h2>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Token hôm nay', value: todayTokens, limit: limits.dailyUserTokens, color: '#EF4444' },
            { label: 'Token tháng này', value: monthTokens, limit: limits.monthlyUserTokens, color: '#7C3AED' },
          ].map(item => {
            const pct = item.limit > 0 ? Math.min(100, Math.round((item.value / item.limit) * 100)) : 0;
            return (
              <div key={item.label} style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.035)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: item.color, fontWeight: 800 }}>{pct}%</span>
                </div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {item.value.toLocaleString()} / {item.limit.toLocaleString()}
                </p>
                <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          Hạn mức user mặc định: {limits.dailyUserTokens.toLocaleString()} token/ngày, {limits.monthlyUserTokens.toLocaleString()} token/tháng. Có thể chỉnh bằng env `AI_DAILY_USER_TOKEN_LIMIT` và `AI_MONTHLY_USER_TOKEN_LIMIT`.
        </p>
      </div>

      <div className="glass-card" style={{ padding: 24, marginTop: 24 }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 16 }}>Token theo model</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Provider', 'Model', 'Requests', 'Input', 'Output', 'Tổng token', 'Cost'].map(header => (
                  <th key={header} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usageByModel.map(item => {
                const input = item._sum.inputTokens ?? 0;
                const output = item._sum.outputTokens ?? 0;
                return (
                  <tr key={`${item.provider}-${item.model}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{item.provider}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{item.model}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{item._count._all.toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#06B6D4', fontWeight: 700 }}>{input.toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#10B981', fontWeight: 700 }}>{output.toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#EF4444', fontWeight: 700 }}>{(input + output).toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#F59E0B', fontWeight: 700 }}>${(item._sum.estimatedCost ?? 0).toFixed(6)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24, marginTop: 24 }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 16 }}>Log gần nhất</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Thời gian', 'User', 'Provider', 'Model', 'Token tiêu hao', 'Cost'].map(header => (
                  <th key={header} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{log.createdAt.toLocaleString('vi-VN')}</td>
                  <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{log.user?.name || log.user?.email || 'Ẩn danh'}</td>
                  <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{log.provider}</td>
                  <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{log.model}</td>
                  <td style={{ padding: '12px', fontSize: 13, color: '#EF4444', fontWeight: 700 }}>{(log.inputTokens + log.outputTokens).toLocaleString()}</td>
                  <td style={{ padding: '12px', fontSize: 13, color: '#F59E0B', fontWeight: 700 }}>${log.estimatedCost.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
