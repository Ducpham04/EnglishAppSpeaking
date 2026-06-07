import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sessions = await prisma.session.findMany({
    where: { studentId: session.user.id },
    include: { topic: true },
    orderBy: { startedAt: 'desc' },
  });
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { topicId, level, assignmentId } = await req.json();
  if (!topicId || !level) return NextResponse.json({ error: 'topicId and level are required' }, { status: 400 });

  const newSession = await prisma.session.create({
    data: {
      studentId: session.user.id,
      topicId,
      level,
      assignmentId: assignmentId || null,
      status: 'active',
    },
  });
  return NextResponse.json(newSession, { status: 201 });
}
