'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Mic, LayoutDashboard, BookOpen, History, TrendingUp,
  Users, School, ClipboardList, Settings,
  LogOut, ChevronRight, Shield, BarChart2, CreditCard,
} from 'lucide-react';

type NavItem = { label: string; href: string; icon: React.ElementType };

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Bài tập', href: '/student/assignments', icon: ClipboardList },
  { label: 'Lịch sử', href: '/student/sessions', icon: History },
  { label: 'Tiến độ', href: '/student/progress', icon: TrendingUp },
  { label: 'Gói của tôi', href: '/account', icon: CreditCard },
];

const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Lớp học', href: '/teacher/classes', icon: School },
  { label: 'Bài tập', href: '/teacher/assignments', icon: ClipboardList },
  { label: 'Hội thoại AI', href: '/teacher/topics', icon: Mic },
  { label: 'Học viên', href: '/teacher/students', icon: Users },
  { label: 'Gói của tôi', href: '/account', icon: CreditCard },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Giáo viên', href: '/admin/teachers', icon: Users },
  { label: 'Học viên', href: '/admin/students', icon: BookOpen },
  { label: 'Topic', href: '/admin/topics', icon: Mic },
  { label: 'Usage', href: '/admin/usage', icon: BarChart2 },
  { label: 'Cài đặt', href: '/admin/settings', icon: Settings },
];

const ROLE_COLOR: Record<string, string> = {
  admin: '#EF4444',
  teacher: '#F59E0B',
  student: '#10B981',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  teacher: 'Giáo viên',
  student: 'Học viên',
};

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role ?? 'student';

  const navItems =
    role === 'admin' ? ADMIN_NAV :
    role === 'teacher' ? TEACHER_NAV :
    STUDENT_NAV;

  const roleColor = ROLE_COLOR[role] || '#7C3AED';

  return (
    <aside style={{
      width: 240, minHeight: '100vh', flexShrink: 0,
      background: 'rgba(10,10,20,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic size={16} color="white" />
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            GB Speaking<span style={{ color: 'var(--primary-light)' }}> AI</span>
          </span>
        </Link>
      </div>

      {/* User info */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `${roleColor}20`, border: `2px solid ${roleColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: roleColor,
          }}>
            {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session?.user?.name}
            </p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
              background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}25`,
            }}>
              {role === 'admin' && <Shield size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 8 }}>
          Menu
        </p>
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: isActive ? `${roleColor}15` : 'transparent',
                border: `1px solid ${isActive ? `${roleColor}25` : 'transparent'}`,
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}>
                <Icon size={16} style={{ color: isActive ? roleColor : 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                {isActive && <ChevronRight size={13} style={{ color: roleColor, marginLeft: 'auto' }} />}
              </div>
            </Link>
          );
        })}

        {/* Demo link */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/demo" style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.15)', cursor: 'pointer',
            }}>
              <Mic size={16} style={{ color: 'var(--primary-light)' }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--primary-light)' }}>Luyện nói AI</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'transparent', border: '1px solid rgba(239,68,68,0.15)',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={15} style={{ color: '#EF4444' }} />
          <span style={{ fontSize: 14, color: '#EF4444', fontWeight: 500 }}>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
