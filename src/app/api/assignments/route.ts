import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatLimitError, getTeacherPlanUsage } from '@/lib/subscriptions';

const ALLOWED_STATUSES = new Set(['draft', 'published']);

function normalizePositiveInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const assignments = await prisma.assignment.findMany({
    where: { teacherId: session.user.id },
    include: {
      topic: true,
      class: { include: { students: true } },
      sessions: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { classId, topicId, title, instruction, deadline, minDurationSec, minMessages, status } = await req.json();
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedStatus = typeof status === 'string' && ALLOWED_STATUSES.has(status) ? status : 'published';

  if (!classId || !topicId || !normalizedTitle) {
    return NextResponse.json({ error: 'classId, topicId, title là bắt buộc' }, { status: 400 });
  }

  if (session.user.role === 'teacher') {
    const usage = await getTeacherPlanUsage(session.user.id);
    const assignmentLimit = usage.plan?.assignmentLimit;
    if (assignmentLimit !== null && assignmentLimit !== undefined && usage.activeAssignments >= assignmentLimit) {
      return NextResponse.json({ error: formatLimitError('assignment', assignmentLimit) }, { status: 402 });
    }
  }

  // Verify teacher owns this class
  const cls = await prisma.class.findFirst({
    where: {
      id: classId,
      status: 'active',
      ...(session.user.role === 'admin' ? {} : { teacherId: session.user.id }),
    },
  });
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { id: true, isPublic: true, createdById: true },
  });
  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  if (session.user.role !== 'admin' && !topic.isPublic && topic.createdById !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden topic' }, { status: 403 });
  }

  const safeMinDurationSec = normalizePositiveInt(minDurationSec, 300, 60, 1800);
  const safeMinMessages = normalizePositiveInt(minMessages, 6, 2, 20);

  const assignment = await prisma.assignment.create({
    data: {
      classId, topicId, teacherId: session.user.id, title: normalizedTitle,
      instruction: typeof instruction === 'string' && instruction.trim() ? instruction.trim() : null,
      deadline: deadline ? new Date(deadline) : null,
      minDurationSec: safeMinDurationSec,
      minMessages: safeMinMessages,
      status: normalizedStatus,
    },
  });
  return NextResponse.json(assignment, { status: 201 });
}
