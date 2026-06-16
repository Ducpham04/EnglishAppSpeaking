import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const EDITABLE_ROLES = new Set(['student', 'teacher']);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const role = typeof body.role === 'string' ? body.role.trim() : '';

  if (!EDITABLE_ROLES.has(role)) {
    return NextResponse.json({ error: 'Chỉ hỗ trợ chuyển giữa học viên và giáo viên' }, { status: 400 });
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Không thể tự đổi role của tài khoản admin đang đăng nhập' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
  }

  if (!EDITABLE_ROLES.has(user.role)) {
    return NextResponse.json({ error: 'Không thể đổi role cho tài khoản admin tại đây' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, role: true },
  });

  return NextResponse.json({
    user: updated,
    message: `Đã chuyển ${user.name} sang ${role === 'teacher' ? 'giáo viên' : 'học viên'}`,
  });
}
