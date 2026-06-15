import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { TOPICS } from '@/lib/topics';
import { formatLimitError, getStudentPlanUsage } from '@/lib/subscriptions';
import { cefrLevelSchema, parseJsonBody } from '@/lib/api-validation';
import { z } from 'zod';

const startSessionSchema = z.object({
  topicId: z.string().trim().min(1, 'topicId is required'),
  level: cefrLevelSchema,
  assignmentId: z.string().trim().min(1).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, startSessionSchema);
    if (!parsed.ok) return parsed.response;

    const { topicId, level, assignmentId } = parsed.data;

    const userSession = await auth();
    const user = userSession?.user;

    // Anonymous users — return null sessionId gracefully (no DB persist)
    if (!user || !user.id) {
      return NextResponse.json({ sessionId: null, anonymous: true });
    }

    let assignmentTopicId: string | null = null;
    if (assignmentId) {
      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          status: 'published',
          class: {
            status: 'active',
            students: { some: { studentId: user.id, status: 'active' } },
          },
        },
        select: { topicId: true },
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }
      assignmentTopicId = assignment.topicId;
    }

    // Resolve topic: first try exact ID in DB, then match by title from in-memory TOPICS
    let resolvedTopicId = topicId;
    const inMemTopic = TOPICS.find(t => t.id === topicId);

    if (inMemTopic) {
      const dbTopic = await prisma.topic.findFirst({ where: { title: inMemTopic.title } });
      if (dbTopic) resolvedTopicId = dbTopic.id;
      else {
        // Topic not yet seeded — skip session creation
        return NextResponse.json({ sessionId: null });
      }
    } else {
      // Assume topicId is already a DB ID
      const dbTopic = await prisma.topic.findUnique({ where: { id: topicId } });
      if (!dbTopic) return NextResponse.json({ sessionId: null });
    }

    if (assignmentTopicId && assignmentTopicId !== resolvedTopicId) {
      return NextResponse.json({ error: 'Assignment topic mismatch' }, { status: 400 });
    }

    if (assignmentId) {
      const existingAssignmentSession = await prisma.session.findFirst({
        where: {
          studentId: user.id,
          assignmentId,
          status: { in: ['active', 'completed'] },
        },
        orderBy: { startedAt: 'desc' },
        select: { id: true, status: true },
      });

      if (existingAssignmentSession?.status === 'active') {
        return NextResponse.json({ sessionId: existingAssignmentSession.id, resumed: true });
      }

      if (existingAssignmentSession?.status === 'completed') {
        return NextResponse.json(
          { error: 'Bạn đã hoàn thành bài tập này. Giáo viên có thể giao bài mới nếu cần luyện lại.' },
          { status: 409 }
        );
      }
    }

    const usage = await getStudentPlanUsage(user.id);
    const sessionLimit = usage.plan?.monthlySessionLimit;
    if (sessionLimit !== null && sessionLimit !== undefined && usage.monthlySessions >= sessionLimit) {
      return NextResponse.json({ error: formatLimitError('session', sessionLimit) }, { status: 402 });
    }

    const session = await prisma.session.create({
      data: {
        studentId: user.id,
        topicId: resolvedTopicId,
        level,
        assignmentId: assignmentId ?? null,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: unknown) {
    console.error('Start session error:', err);
    // Don't fail — just return null so demo still works
    return NextResponse.json({ sessionId: null });
  }
}
