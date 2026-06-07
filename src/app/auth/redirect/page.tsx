import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function AuthRedirectPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (role === 'admin') redirect('/admin/dashboard');
  if (role === 'teacher') redirect('/teacher/dashboard');
  if (role === 'student') redirect('/student/dashboard');

  redirect('/login');
}
