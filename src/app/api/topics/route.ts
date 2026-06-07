import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TOPICS } from '@/lib/topics';
import { Topic } from '@/lib/types';

type DbTopic = {
  id: string;
  title: string;
  icon: string;
  level: string;
  description: string | null;
  openingQuestion: string | null;
};

function normalizeDbTopic(topic: DbTopic): Topic {
  return {
    id: topic.id,
    title: topic.title,
    icon: topic.icon,
    level: topic.level as Topic['level'],
    description: topic.description ?? '',
    openingQuestion: topic.openingQuestion ?? `Let's talk about ${topic.title}.`,
    systemPrompt: '',
  };
}

function mergeTopics(dbTopics: DbTopic[]) {
  const merged = new Map<string, Topic>();

  for (const topic of TOPICS) {
    merged.set(topic.id, topic);
  }

  for (const topic of dbTopics) {
    const normalized = normalizeDbTopic(topic);
    const duplicateByTitle = Array.from(merged.values()).find(
      existing => existing.title.toLowerCase() === normalized.title.toLowerCase()
    );
    merged.set(duplicateByTitle?.id ?? normalized.id, {
      ...(duplicateByTitle ?? normalized),
      ...normalized,
      systemPrompt: duplicateByTitle?.systemPrompt ?? normalized.systemPrompt,
    });
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level);
    return a.title.localeCompare(b.title);
  });
}

export async function GET() {
  const session = await auth();
  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  if (userRole === 'admin') {
    const topics = await prisma.topic.findMany({
      orderBy: [{ level: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true, icon: true, level: true, description: true, openingQuestion: true },
    });
    return NextResponse.json({ topics: mergeTopics(topics) });
  }

  if (userRole === 'teacher' && userId) {
    const topics = await prisma.topic.findMany({
      where: {
        OR: [
          { isPublic: true },
          { createdById: userId },
        ],
      },
      orderBy: [{ level: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true, icon: true, level: true, description: true, openingQuestion: true },
    });
    return NextResponse.json({ topics: mergeTopics(topics) });
  }

  const topics = await prisma.topic.findMany({
    where: { isPublic: true },
    orderBy: [{ level: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, icon: true, level: true, description: true, openingQuestion: true },
  });

  return NextResponse.json({ topics: mergeTopics(topics) });
}
