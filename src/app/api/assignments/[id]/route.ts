import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function findOwnedAssignment(id: string, userId: string, role: string) {
  return prisma.assignment.findFirst({
    where: {
      id,
      ...(role === 'admin' ? {} : { teacherId: userId }),
    },
    include: {
      topic: true,
      class: {
        include: {
          students: true,
        },
      },
      sessions: true,
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      topic: true,
      class: { include: { students: { where: { studentId: session.user.id } } } },
    },
  });

  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check access: teacher of this class, admin, or enrolled student
  const role = session.user.role;
  if (role === 'student') {
    const isEnrolled = assignment.class.students.length > 0;
    if (!isEnrolled) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else if (role === 'teacher' && assignment.teacherId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(assignment);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const assignment = await findOwnedAssignment(id, session.user.id, session.user.role);
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const {
    classId,
    topicId,
    title,
    instruction,
    deadline,
    minDurationSec,
    minMessages,
    status,
  } = body as {
    classId?: string;
    topicId?: string;
    title?: string;
    instruction?: string | null;
    deadline?: string | null;
    minDurationSec?: number;
    minMessages?: number;
    status?: string;
  };

  if (title !== undefined && title.trim().length === 0) {
    return NextResponse.json({ error: 'Tiêu đề bài tập không được để trống' }, { status: 400 });
  }

  if (classId && classId !== assignment.classId) {
    const cls = await prisma.class.findFirst({
      where: {
        id: classId,
        ...(session.user.role === 'admin' ? {} : { teacherId: session.user.id }),
      },
      select: { id: true },
    });
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  if (topicId && topicId !== assignment.topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, isPublic: true, createdById: true },
    });
    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    if (session.user.role !== 'admin' && !topic.isPublic && topic.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden topic' }, { status: 403 });
    }
  }

  const updated = await prisma.assignment.update({
    where: { id },
    data: {
      ...(classId ? { classId } : {}),
      ...(topicId ? { topicId } : {}),
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(instruction !== undefined ? { instruction: instruction || null } : {}),
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      ...(minDurationSec !== undefined ? { minDurationSec } : {}),
      ...(minMessages !== undefined ? { minMessages } : {}),
      ...(status ? { status } : {}),
    },
    include: { topic: true, class: true, sessions: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const assignment = await findOwnedAssignment(id, session.user.id, session.user.role);
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (assignment.sessions.length > 0) {
    const archived = await prisma.assignment.update({
      where: { id },
      data: { status: 'archived' },
    });
    return NextResponse.json({ assignment: archived, deleted: false, archived: true });
  }

  await prisma.assignment.delete({ where: { id } });
  return NextResponse.json({ deleted: true, archived: false });
}
