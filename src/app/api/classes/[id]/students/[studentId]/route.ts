import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status } = await request.json() as { status?: string };
  if (!status || !['active', 'inactive'].includes(status)) {
    return NextResponse.json({ error: 'Trạng thái học viên không hợp lệ' }, { status: 400 });
  }

  const cls = await prisma.class.findFirst({
    where: {
      id,
      ...(session.user.role === 'admin' ? {} : { teacherId: session.user.id }),
    },
    select: { id: true },
  });
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

  const enrollment = await prisma.classStudent.findFirst({
    where: { classId: id, studentId },
    select: { id: true },
  });
  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

  const updated = await prisma.classStudent.update({
    where: { id: enrollment.id },
    data: { status },
  });

  return NextResponse.json({ enrollment: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cls = await prisma.class.findFirst({
    where: {
      id,
      ...(session.user.role === 'admin' ? {} : { teacherId: session.user.id }),
    },
    select: { id: true },
  });
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

  const enrollment = await prisma.classStudent.findFirst({
    where: { classId: id, studentId },
    select: { id: true },
  });
  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

  const updated = await prisma.classStudent.update({
    where: { id: enrollment.id },
    data: { status: 'inactive' },
  });

  return NextResponse.json({ removed: true, enrollment: updated });
}
