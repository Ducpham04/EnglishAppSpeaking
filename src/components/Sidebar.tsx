'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Mic, LayoutDashboard, BookOpen, History, TrendingUp,
  Users, School, ClipboardList, Settings,
  LogOut, ChevronRight, Shield, BarChart2, CreditCard, CircleHelp,
} from 'lucide-react';

type NavItem = { label: string; href: string; icon: React.ElementType };

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Lớp học', href: '/student/classes', icon: School },
  { label: 'Bài tập', href: '/student/assignments', icon: ClipboardList },
  { label: 'Lịch sử', href: '/student/sessions', icon: History },
  { label: 'Tiến độ', href: '/student/progress', icon: TrendingUp },
  { label: 'Hướng dẫn', href: '/student/help', icon: CircleHelp },
  { label: 'Gói của tôi', href: '/account', icon: CreditCard },
];

const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Lớp học', href: '/teacher/classes', icon: School },
  { label: 'Bài tập', href: '/teacher/assignments', icon: ClipboardList },
  { label: 'Hội thoại AI', href: '/teacher/topics', icon: Mic },
  { label: 'Học viên', href: '/teacher/students', icon: Users },
  { label: 'Hướng dẫn', href: '/teacher/help', icon: CircleHelp },
  { label: 'Gói của tôi', href: '/account', icon: CreditCard },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Giáo viên', href: '/admin/teachers', icon: Users },
  { label: 'Học viên', href: '/admin/students', icon: BookOpen },
  { label: 'Gói', href: '/admin/plans', icon: CreditCard },
  { label: 'Topic', href: '/admin/topics', icon: Mic },
  { label: 'Usage', href: '/admin/usage', icon: BarChart2 },
  { label: 'Cài đặt', href: '/admin/settings', icon: Settings },
];

const ROLE_COLOR: Record<string, string> = {
  admin: '#DC2626',
  teacher: '#2563EB',
  student: '#0F766E',
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
    <aside className="app-sidebar" style={{
      width: 260, minHeight: '100vh', flexShrink: 0,
      background: '#FFFFFF',
      borderRight: '1px solid #E5E7EB',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
    }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: '22px 20px 18px', borderBottom: '1px solid #E5E7EB' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic size={17} color="var(--primary)" />
          </div>
          <div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
              GB Speaking AI
            </span>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Speaking practice workspace</p>
          </div>
        </Link>
      </div>

      {/* User info */}
      <div className="sidebar-user" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: `${roleColor}12`, border: `1px solid ${roleColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: roleColor, flexShrink: 0,
          }}>
            {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session?.user?.name}
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
              background: `${roleColor}10`, color: roleColor, border: `1px solid ${roleColor}25`,
            }}>
              {role === 'admin' && <Shield size={9} />}
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" aria-label="Điều hướng workspace" style={{ flex: 1, padding: '12px 12px' }}>
        <p className="sidebar-section-label" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
          Workspace
        </p>
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              <div className="sidebar-nav-item" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: isActive ? `${roleColor}10` : 'transparent',
                border: `1px solid ${isActive ? `${roleColor}25` : 'transparent'}`,
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}>
                <Icon size={16} style={{ color: isActive ? roleColor : 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                {isActive && <ChevronRight size={13} style={{ color: roleColor, marginLeft: 'auto' }} />}
              </div>
            </Link>
          );
        })}

        {/* Demo link */}
        <div className="sidebar-demo-link" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
          <Link href="/demo" style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
            <div className="sidebar-nav-item" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, background: '#EFF6FF',
              border: '1px solid #BFDBFE', cursor: 'pointer',
            }}>
              <Mic size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>Luyện nói AI</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* Logout */}
      <div className="sidebar-logout" style={{ padding: '12px 12px 20px', borderTop: '1px solid #E5E7EB' }}>
        <button
          aria-label="Đăng xuất khỏi tài khoản"
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: 'transparent', border: '1px solid #FECACA',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={15} style={{ color: '#EF4444' }} />
          <span style={{ fontSize: 14, color: '#EF4444', fontWeight: 500 }}>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
