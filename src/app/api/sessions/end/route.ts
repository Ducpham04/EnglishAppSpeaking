import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { calculateSessionScore, isCorrectionMessage } from '@/lib/conversation-policy';
import { evaluateConversation } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const userSession = await auth();
    const user = userSession?.user;

    const { sessionId, totalUserMessages = 0, totalAiMessages = 0, score } = await request.json();

    // No sessionId or not authenticated — nothing to update
    if (!sessionId || !user?.id) return NextResponse.json({ ok: true });


    const existingSession = await prisma.session.findFirst({
      where: { id: sessionId, studentId: user.id },
      include: {
        topic: true,
        assignment: {
          select: {
            title: true,
            instruction: true,
            minMessages: true,
            minDurationSec: true,
          },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const endedAt = new Date();
    const durationSec = Math.max(
      0,
      Math.floor((endedAt.getTime() - existingSession.startedAt.getTime()) / 1000)
    );
    const persistedUserMessages = existingSession.messages.filter(message => message.role === 'user').length;
    const persistedAiMessages = existingSession.messages.filter(message => message.role === 'assistant').length;
    const correctionCount = existingSession.messages.filter(message => message.role === 'assistant' && isCorrectionMessage(message)).length;
    const finalUserMessages = persistedUserMessages || totalUserMessages;
    const finalAiMessages = persistedAiMessages || totalAiMessages;
    const finalScore = calculateSessionScore({
      userMessages: finalUserMessages,
      correctionCount,
      durationSec,
      minMessages: existingSession.assignment?.minMessages,
      minDurationSec: existingSession.assignment?.minDurationSec,
    });
    const evaluation = await evaluateConversation({
      topicTitle: existingSession.topic.title,
      level: existingSession.level,
      assignmentTitle: existingSession.assignment?.title,
      assignmentInstruction: existingSession.assignment?.instruction,
      minMessages: existingSession.assignment?.minMessages,
      durationSec,
      userMessages: existingSession.messages
        .filter(message => message.role === 'user')
        .map(message => message.content),
      assistantMessages: existingSession.messages
        .filter(message => message.role === 'assistant')
        .map(message => message.content),
      correctionCount,
    });
    const cappedOverallScore = score !== undefined
      ? Math.min(score, evaluation.overallScore, finalScore)
      : Math.min(evaluation.overallScore, Math.max(finalScore, evaluation.overallScore - 5));
    const gatedTaskScore = evaluation.offTopic || evaluation.tooMuchVietnamese
      ? Math.min(evaluation.taskScore, cappedOverallScore)
      : evaluation.taskScore;

    await prisma.session.update({
      where: { id: existingSession.id },
      data: {
        endedAt,
        durationSec,
        totalUserMessages: finalUserMessages,
        totalAiMessages: finalAiMessages,
        score: cappedOverallScore,
        taskScore: gatedTaskScore,
        fluencyScore: evaluation.fluencyScore,
        grammarScore: evaluation.grammarScore,
        vocabularyScore: evaluation.vocabularyScore,
        coherenceScore: evaluation.coherenceScore,
        feedbackJson: JSON.stringify({
          ...evaluation,
          overallScore: cappedOverallScore,
          taskScore: gatedTaskScore,
        }),
        status: 'completed',
      },
    });

    return NextResponse.json({
      ok: true,
      score: cappedOverallScore,
      durationSec,
      totalUserMessages: finalUserMessages,
      totalAiMessages: finalAiMessages,
      evaluation: {
        ...evaluation,
        overallScore: cappedOverallScore,
        taskScore: gatedTaskScore,
      },
    });
  } catch (err: unknown) {
    console.error('End session error:', err);
    return NextResponse.json({ error: 'Could not end session' }, { status: 500 });
  }
}
