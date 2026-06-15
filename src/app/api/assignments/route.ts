import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatLimitError, getTeacherPlanUsage } from '@/lib/subscriptions';
import { parseJsonBody } from '@/lib/api-validation';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ALLOWED_STATUSES = new Set(['draft', 'published']);

function boundedInt(defaultValue: number, min: number, max: number) {
  return z.preprocess(
    value => value === undefined ? defaultValue : Number(value),
    z.number().int()
  ).transform(value => Math.min(max, Math.max(min, value)));
}

const assignmentCreateSchema = z.object({
  classId: z.string().trim().min(1, 'classId is required'),
  topicId: z.string().trim().min(1, 'topicId is required'),
  title: z.string().trim().min(1, 'title is required').max(160),
  instruction: z.string().max(5000).optional().nullable(),
  deadline: z.string()
    .refine(value => !value || !Number.isNaN(Date.parse(value)), 'deadline must be a valid date')
    .optional()
    .nullable(),
  minDurationSec: boundedInt(300, 60, 1800),
  minMessages: boundedInt(6, 2, 20),
  status: z.enum(['draft', 'published']).default('published'),
});

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
  const parsed = await parseJsonBody(req, assignmentCreateSchema);
  if (!parsed.ok) return parsed.response;

  const { classId, topicId, title, instruction, deadline, minDurationSec, minMessages, status } = parsed.data;
  const normalizedStatus = ALLOWED_STATUSES.has(status) ? status : 'published';

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

  const assignment = await prisma.assignment.create({
    data: {
      classId, topicId, teacherId: session.user.id, title,
      instruction: typeof instruction === 'string' && instruction.trim() ? instruction.trim() : null,
      deadline: deadline ? new Date(deadline) : null,
      minDurationSec,
      minMessages,
      status: normalizedStatus,
    },
  });
  logger.info('Assignment created', {
    scope: 'audit.assignment.create',
    actorId: session.user.id,
    assignmentId: assignment.id,
    classId,
    topicId,
    status: normalizedStatus,
  });
  return NextResponse.json(assignment, { status: 201 });
}
