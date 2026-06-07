import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import { Users, School, Mic, BarChart2, Shield, Clock } from 'lucide-react';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  const [totalUsers, totalTeachers, totalStudents, totalClasses, totalSessions, totalMessages, recentUsers, usageLogs] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'teacher' } }),
    prisma.user.count({ where: { role: 'student' } }),
    prisma.class.count(),
    prisma.session.count(),
    prisma.message.count(),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.aiUsageLog.aggregate({ _sum: { inputTokens: true, outputTokens: true, estimatedCost: true } }),
  ]);

  const ROLE_COLORS: Record<string, string> = { admin: '#EF4444', teacher: '#F59E0B', student: '#10B981' };
  const ROLE_LABELS: Record<string, string> = { admin: 'Admin', teacher: 'Giáo viên', student: 'Học viên' };
  const totalAiTokens = (usageLogs._sum.inputTokens ?? 0) + (usageLogs._sum.outputTokens ?? 0);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={20} style={{ color: '#EF4444' }} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)' }}>Admin Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Quản lý toàn bộ hệ thống GB Speaking AI</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatsCard icon={Users} label="Tổng users" value={totalUsers} color="#7C3AED" />
        <StatsCard icon={Shield} label="Giáo viên" value={totalTeachers} color="#F59E0B" />
        <StatsCard icon={Users} label="Học viên" value={totalStudents} color="#10B981" />
        <StatsCard icon={School} label="Lớp học" value={totalClasses} color="#06B6D4" />
        <StatsCard icon={Mic} label="Sessions" value={totalSessions} color="#8B5CF6" />
        <StatsCard icon={BarChart2} label="Messages" value={totalMessages} color="#EF4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent users */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 20 }}>👥 Users mới nhất</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentUsers.map(u => {
              const roleColor = ROLE_COLORS[u.role] || '#7C3AED';
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${roleColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: roleColor }}>
                    {u.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{u.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${roleColor}15`, color: roleColor }}>{ROLE_LABELS[u.role]}</span>
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: u.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: u.status === 'active' ? '#10B981' : '#EF4444' }}>{u.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Usage */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 20 }}>🤖 AI Usage Tổng hợp</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Tổng token tiêu hao', value: totalAiTokens.toLocaleString(), color: '#EF4444' },
              { label: 'Input tokens', value: (usageLogs._sum.inputTokens ?? 0).toLocaleString(), color: '#7C3AED' },
              { label: 'Output tokens', value: (usageLogs._sum.outputTokens ?? 0).toLocaleString(), color: '#06B6D4' },
              { label: 'Estimated cost', value: `$${(usageLogs._sum.estimatedCost ?? 0).toFixed(4)}`, color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: 'Outfit, sans-serif' }}>{item.value}</span>
              </div>
            ))}
            <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} style={{ color: '#10B981' }} />
                <span style={{ fontSize: 12, color: '#10B981' }}>Token được ghi theo từng request AI trong trang Usage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
