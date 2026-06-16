import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (password.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu mới cần ít nhất 6 ký tự' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
  }

  if (!['student', 'teacher', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Vai trò tài khoản không hợp lệ' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    message: `Đã cập nhật mật khẩu cho ${user.name}`,
  });
}
