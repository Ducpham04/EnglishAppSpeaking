import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Settings, Shield, Info } from 'lucide-react';

export default async function AdminSettings() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  return (
    <DashboardLayout title="Cài đặt Admin">
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 16 }}>Cài đặt ứng dụng chung</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>Hiện tại trang cài đặt chỉ hiển thị thông tin cấu hình cơ bản. Bạn có thể mở rộng nó với các tùy chọn quản trị như quản lý vai trò, thiết lập giới hạn AI hoặc cấu hình hệ thống.</p>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Settings size={18} style={{ color: '#7C3AED' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Hệ thống</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>Cấu hình các thông số ứng dụng, giới hạn phiên, cấu hình AI và tổng quan trạng thái.</p>
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Shield size={18} style={{ color: '#EF4444' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Bảo mật</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>Quản lý khóa API, mật khẩu và quyền truy cập. Mở rộng để hỗ trợ audit và đăng nhập an toàn.</p>
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Info size={18} style={{ color: '#F59E0B' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Thông tin</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>Thông tin phiên bản, trạng thái app và các liên kết hữu ích cho quản trị viên.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
