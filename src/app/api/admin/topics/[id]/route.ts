import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id: topicId } = await context.params;
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, level, icon, openingQuestion, systemPrompt, isPublic } = body as {
    title?: string;
    description?: string;
    level?: string;
    icon?: string;
    openingQuestion?: string;
    systemPrompt?: string;
    isPublic?: boolean;
  };

  if (!topicId) {
    return NextResponse.json({ error: 'Missing topic id' }, { status: 400 });
  }

  const updatedTopic = await prisma.topic.update({
    where: { id: topicId },
    data: {
      title,
      description,
      level,
      icon,
      openingQuestion,
      systemPrompt,
      isPublic,
    },
  });

  return NextResponse.json({ topic: updatedTopic });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id: topicId } = await context.params;
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!topicId) {
    return NextResponse.json({ error: 'Missing topic id' }, { status: 400 });
  }

  await prisma.topic.delete({ where: { id: topicId } });
  return NextResponse.json({ success: true });
}
