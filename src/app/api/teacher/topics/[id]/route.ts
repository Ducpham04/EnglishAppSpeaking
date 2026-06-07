import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

async function findOwnedTopic(id: string, userId: string, role: string) {
  return prisma.topic.findFirst({
    where: {
      id,
      ...(role === 'admin' ? {} : { createdById: userId }),
    },
    include: {
      _count: {
        select: { assignments: true, sessions: true },
      },
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const topic = await findOwnedTopic(id, session.user.id, session.user.role);
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ topic });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const topic = await findOwnedTopic(id, session.user.id, session.user.role);
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const {
    title,
    description,
    level,
    icon,
    openingQuestion,
    systemPrompt,
    isPublic,
  } = body as {
    title?: string;
    description?: string | null;
    level?: string;
    icon?: string;
    openingQuestion?: string;
    systemPrompt?: string;
    isPublic?: boolean;
  };

  if (title !== undefined && title.trim().length === 0) {
    return NextResponse.json({ error: 'Tiêu đề không được để trống' }, { status: 400 });
  }
  if (level !== undefined && !LEVELS.has(level)) {
    return NextResponse.json({ error: 'Level không hợp lệ' }, { status: 400 });
  }
  if (openingQuestion !== undefined && openingQuestion.trim().length === 0) {
    return NextResponse.json({ error: 'Câu mở đầu không được để trống' }, { status: 400 });
  }
  if (systemPrompt !== undefined && systemPrompt.trim().length === 0) {
    return NextResponse.json({ error: 'System prompt không được để trống' }, { status: 400 });
  }

  const updated = await prisma.topic.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || '' } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(icon !== undefined ? { icon: icon.trim() || '🗣️' } : {}),
      ...(openingQuestion !== undefined ? { openingQuestion: openingQuestion.trim() } : {}),
      ...(systemPrompt !== undefined ? { systemPrompt: systemPrompt.trim() } : {}),
      ...(typeof isPublic === 'boolean' ? { isPublic } : {}),
    },
    include: {
      _count: {
        select: { assignments: true, sessions: true },
      },
    },
  });

  return NextResponse.json({ topic: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const topic = await findOwnedTopic(id, session.user.id, session.user.role);
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (topic._count.assignments > 0 || topic._count.sessions > 0) {
    return NextResponse.json({ error: 'Topic đã có bài tập hoặc buổi luyện. Hãy ẩn topic thay vì xóa.' }, { status: 409 });
  }

  await prisma.topic.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
