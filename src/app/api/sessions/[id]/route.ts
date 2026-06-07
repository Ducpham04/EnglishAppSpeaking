import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const practiceSession = await prisma.session.findUnique({ where: { id } });
  if (!practiceSession || practiceSession.studentId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.session.update({
    where: { id },
    data: {
      status: body.status || practiceSession.status,
      endedAt: body.status === 'completed' ? new Date() : practiceSession.endedAt,
      durationSec: body.durationSec ?? practiceSession.durationSec,
      totalUserMessages: body.totalUserMessages ?? practiceSession.totalUserMessages,
      totalAiMessages: body.totalAiMessages ?? practiceSession.totalAiMessages,
      score: body.score ?? practiceSession.score,
    },
  });
  return NextResponse.json(updated);
}
