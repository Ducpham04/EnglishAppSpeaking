import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id,
      ...(session.user.role === 'admin' ? {} : { teacherId: session.user.id }),
      class: {
        students: {
          some: { studentId, status: 'active' },
        },
      },
    },
    select: { id: true },
  });

  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

  const completedSession = await prisma.session.findFirst({
    where: {
      assignmentId: id,
      studentId,
      status: 'completed',
    },
    orderBy: { endedAt: 'desc' },
    select: { id: true },
  });

  if (!completedSession) {
    return NextResponse.json({ error: 'Student has no completed session for this assignment' }, { status: 404 });
  }

  const updated = await prisma.session.update({
    where: { id: completedSession.id },
    data: { status: 'needs_retry' },
  });

  return NextResponse.json({ ok: true, session: updated });
}
