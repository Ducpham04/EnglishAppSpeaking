import { NextRequest, NextResponse } from 'next/server';
import { getAIResponse } from '@/lib/ai';
import { TOPICS } from '@/lib/topics';
import { ConversationHistory } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getConversationProgress } from '@/lib/conversation-policy';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkUserUsageLimit, getUsageWarning } from '@/lib/usage-control';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentMessage, topicId, level, history, sessionId } = body as {
      studentMessage: string;
      topicId: string;
      level: string;
      sessionId?: string;
      history: ConversationHistory[];
    };

    if (!studentMessage || !topicId || !level) {
      return NextResponse.json(
        { error: 'Missing required fields: studentMessage, topicId, level' },
        { status: 400 }
      );
    }

    if (studentMessage.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long' },
        { status: 400 }
      );
    }

    const dbTopic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        title: true,
        systemPrompt: true,
      },
    });
    const inMemoryTopic = TOPICS.find(t => t.id === topicId);
    let topic = dbTopic ?? inMemoryTopic;
    let resolvedTopicId = dbTopic?.id ?? topicId;

    if (!dbTopic && inMemoryTopic) {
      const matchingDbTopic = await prisma.topic.findFirst({
        where: { title: inMemoryTopic.title },
        select: { id: true, title: true, systemPrompt: true },
      });
      if (matchingDbTopic) {
        topic = {
          ...matchingDbTopic,
          systemPrompt: matchingDbTopic.systemPrompt || inMemoryTopic.systemPrompt,
        };
        resolvedTopicId = matchingDbTopic.id;
      }
    }

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const rateLimitPerHour = Number(process.env.AI_RATE_LIMIT_PER_IP_PER_HOUR || 30);
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimit = checkRateLimit({
      key: sessionId ? `session:${sessionId}` : `ip:${ip}`,
      limit: rateLimitPerHour,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Bạn đã gửi quá nhiều lượt luyện trong thời gian ngắn. Vui lòng thử lại sau.',
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      );
    }

    let persistedSession: {
      id: string;
      studentId: string;
      topicId: string;
      status: string;
      startedAt: Date;
      assignment: {
        id: string;
        status: string;
        minMessages: number;
        minDurationSec: number;
      } | null;
      _count: { messages: number };
    } | null = null;
    let usageWarning: string | null = null;

    if (sessionId) {
      const userSession = await auth();
      const user = userSession?.user;
      if (!user?.id) {
        return NextResponse.json({ error: 'Bạn cần đăng nhập để tiếp tục bài luyện này' }, { status: 401 });
      }

      const usageLimit = await checkUserUsageLimit(user.id);
      if (!usageLimit.allowed) {
        return NextResponse.json(
          {
            error: usageLimit.reason,
            quota: usageLimit,
          },
          { status: 402 }
        );
      }
      usageWarning = getUsageWarning(usageLimit);

      persistedSession = await prisma.session.findFirst({
        where: { id: sessionId, studentId: user.id },
        include: {
          assignment: { select: { id: true, status: true, minMessages: true, minDurationSec: true } },
          _count: { select: { messages: { where: { role: 'user' } } } },
        },
      });

      if (!persistedSession) {
        return NextResponse.json({ error: 'Không tìm thấy buổi luyện hợp lệ' }, { status: 404 });
      }

      if (persistedSession.status !== 'active') {
        return NextResponse.json(
          { error: 'Buổi luyện này đã kết thúc. Hãy mở bài mới nếu muốn luyện tiếp.' },
          { status: 409 }
        );
      }

      if (persistedSession.assignment?.status !== 'published') {
        return NextResponse.json(
          { error: 'Bài tập này hiện không còn mở để luyện.' },
          { status: 403 }
        );
      }

      if (persistedSession.topicId !== resolvedTopicId) {
        return NextResponse.json({ error: 'Topic không khớp với buổi luyện' }, { status: 400 });
      }

      const progressBeforeMessage = getConversationProgress({
        userMessages: persistedSession._count.messages,
        minMessages: persistedSession.assignment?.minMessages,
        minDurationSec: persistedSession.assignment?.minDurationSec,
        startedAt: persistedSession.startedAt,
      });

      if (progressBeforeMessage.reachedMaxMessages) {
        return NextResponse.json(
          {
            error: 'Bạn đã đạt giới hạn lượt nói của bài này. Hãy bấm “Kết thúc buổi” để nhận điểm.',
            conversation: progressBeforeMessage,
          },
          { status: 429 }
        );
      }
    }

    const { aiResponse, usage, fallback } = await getAIResponse(
      studentMessage,
      topic.systemPrompt,
      history || [],
      level,
      topic.title
    );

    let conversation:
      | ReturnType<typeof getConversationProgress>
      | undefined;

    // Persist messages and usage logs if sessionId provided and user authenticated
    try {
      if (persistedSession) {
        // Create user message
        await prisma.message.create({
          data: {
            sessionId: persistedSession.id,
            role: 'user',
            content: studentMessage,
          },
        });

        const aiContent = aiResponse.followUpQuestion ? `${aiResponse.reply} ${aiResponse.followUpQuestion}` : aiResponse.reply;

        await prisma.message.create({
          data: {
            sessionId: persistedSession.id,
            role: 'assistant',
            content: aiContent,
            corrections: JSON.stringify(aiResponse.correction || {}),
            aiMetadata: JSON.stringify(usage || { provider: 'unknown' }),
          },
        });

        // Persist AI usage log if available
        await prisma.aiUsageLog.create({
          data: {
            userId: persistedSession.studentId,
            sessionId: persistedSession.id,
            provider: usage?.provider || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai'),
            model: usage?.model || (process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || 'unknown'),
            inputTokens: usage?.inputTokens ?? 0,
            outputTokens: usage?.outputTokens ?? 0,
            estimatedCost: usage?.estimatedCost ?? 0,
          },
        });

        conversation = getConversationProgress({
          userMessages: persistedSession._count.messages + 1,
          minMessages: persistedSession.assignment?.minMessages,
          minDurationSec: persistedSession.assignment?.minDurationSec,
          startedAt: persistedSession.startedAt,
        });
      }
    } catch (err) {
      logger.error('Failed to persist chat session data', err, {
        scope: 'api.chat.persist',
        sessionId: persistedSession?.id,
      });
    }

    // Return the AI response and usage metadata to the client
    return NextResponse.json({ aiResponse, usage, fallback, conversation, usageWarning });
  } catch (error: unknown) {
    logger.error('AI API error', error, { scope: 'api.chat' });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errMessage.includes('timeout') || errMessage.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { error: 'AI is taking too long to respond. Please try again.' },
        { status: 504 }
      );
    }

    if (errMessage.includes('No OpenAI key configured') || errMessage.includes('quota')) {
      return NextResponse.json(
        { error: errMessage },
        { status: 503 }
      );
    }

    if (errMessage.includes('AI providers failed')) {
      return NextResponse.json(
        { error: errMessage },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: errMessage || 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
