import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import AdminTopicManager from '@/components/AdminTopicManager';

export default async function AdminTopicsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  return (
    <DashboardLayout title="Quản lý Topic">
      <AdminTopicManager />
    </DashboardLayout>
  );
}
