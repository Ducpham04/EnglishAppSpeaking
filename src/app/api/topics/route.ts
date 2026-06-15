import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TOPICS } from '@/lib/topics';
import { Topic } from '@/lib/types';
import { logger } from '@/lib/logger';

type DbTopic = {
  id: string;
  title: string;
  icon: string;
  level: string;
  description: string | null;
  openingQuestion: string | null;
};
type TopicSession = {
  user?: {
    id?: string;
    role?: string;
  };
} | null;

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
  let session: TopicSession = null;

  try {
    session = await auth() as TopicSession;
  } catch (error) {
    logger.warn('Topics auth unavailable, serving built-in topics', {
      route: '/api/topics',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  try {
    if (userRole === 'admin') {
      const topics = await prisma.topic.findMany({
        orderBy: [{ level: 'asc' }, { title: 'asc' }],
        select: { id: true, title: true, icon: true, level: true, description: true, openingQuestion: true },
      });
      return NextResponse.json({ topics: mergeTopics(topics), source: 'database' });
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
      return NextResponse.json({ topics: mergeTopics(topics), source: 'database' });
    }

    const topics = await prisma.topic.findMany({
      where: { isPublic: true },
      orderBy: [{ level: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true, icon: true, level: true, description: true, openingQuestion: true },
    });

    return NextResponse.json({ topics: mergeTopics(topics), source: 'database' });
  } catch (error) {
    logger.warn('Topics database unavailable, serving built-in topics', {
      route: '/api/topics',
      role: userRole ?? 'guest',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({
      topics: mergeTopics([]),
      source: 'fallback',
      warning: 'Topic database is temporarily unavailable. Built-in topics are being used.',
    });
  }
}
