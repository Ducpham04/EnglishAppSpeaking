import { Message } from '@prisma/client';

export const DEFAULT_MIN_MESSAGES = 5;
export const DEFAULT_MIN_DURATION_SEC = 180;
export const DEFAULT_MAX_USER_MESSAGES = 8;
export const ASSIGNMENT_EXTRA_MESSAGE_BUFFER = 3;
export const ABSOLUTE_MAX_USER_MESSAGES = 14;

type CorrectionPayload = {
  hasCorrection?: boolean;
};

export function getMaxUserMessages(minMessages?: number | null) {
  const minimum = minMessages ?? DEFAULT_MIN_MESSAGES;
  return Math.min(
    ABSOLUTE_MAX_USER_MESSAGES,
    Math.max(DEFAULT_MAX_USER_MESSAGES, minimum + ASSIGNMENT_EXTRA_MESSAGE_BUFFER)
  );
}

export function isCorrectionMessage(message: Pick<Message, 'corrections'>) {
  if (!message.corrections) return false;
  try {
    const parsed = JSON.parse(message.corrections) as CorrectionPayload;
    return parsed.hasCorrection === true;
  } catch {
    return false;
  }
}

export function calculateSessionScore(input: {
  userMessages: number;
  correctionCount: number;
  durationSec: number;
  minMessages?: number | null;
  minDurationSec?: number | null;
}) {
  const minMessages = input.minMessages ?? DEFAULT_MIN_MESSAGES;
  const minDurationSec = input.minDurationSec ?? DEFAULT_MIN_DURATION_SEC;
  const messageCompletion = minMessages > 0
    ? Math.min(1, input.userMessages / minMessages)
    : 1;
  const durationCompletion = minDurationSec > 0
    ? Math.min(1, input.durationSec / minDurationSec)
    : 1;
  const completionScore = Math.round(((messageCompletion * 0.65) + (durationCompletion * 0.35)) * 100);
  const correctionPenalty = Math.min(35, input.correctionCount * 5);

  return Math.max(40, Math.min(100, completionScore - correctionPenalty));
}

export function getConversationProgress(input: {
  userMessages: number;
  minMessages?: number | null;
  minDurationSec?: number | null;
  startedAt?: Date | null;
}) {
  const minMessages = input.minMessages ?? DEFAULT_MIN_MESSAGES;
  const minDurationSec = input.minDurationSec ?? DEFAULT_MIN_DURATION_SEC;
  const maxUserMessages = getMaxUserMessages(minMessages);
  const durationSec = input.startedAt
    ? Math.max(0, Math.floor((Date.now() - input.startedAt.getTime()) / 1000))
    : 0;
  const completed = input.userMessages >= minMessages && durationSec >= minDurationSec;
  const reachedMessageGoal = input.userMessages >= minMessages;
  const reachedMaxMessages = input.userMessages >= maxUserMessages;

  return {
    userMessages: input.userMessages,
    minMessages,
    maxUserMessages,
    durationSec,
    minDurationSec,
    completed,
    reachedMessageGoal,
    reachedMaxMessages,
    shouldFinish: completed || reachedMaxMessages,
  };
}
