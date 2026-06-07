import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const topics = await prisma.topic.findMany({
    where: { createdById: session.user.id },
    orderBy: [{ level: 'asc' }, { title: 'asc' }],
    include: {
      createdBy: true,
      _count: {
        select: { assignments: true, sessions: true },
      },
    },
  });

  return NextResponse.json({ topics });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
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

  if (!title || !level || !icon || !openingQuestion || !systemPrompt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const topic = await prisma.topic.create({
    data: {
      title,
      description: description ?? '',
      level,
      icon,
      openingQuestion,
      systemPrompt,
      isPublic: isPublic ?? true,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ topic }, { status: 201 });
}
