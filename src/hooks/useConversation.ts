'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, AIResponse, ConversationEvaluation, ConversationHistory, CEFRLevel, ProviderFallbackInfo } from '@/lib/types';
import { Topic } from '@/lib/topics';

interface UseConversationReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  providerNotice: string | null;
  conversationProgress: ConversationProgress | null;
  isConversationLocked: boolean;
  sendMessage: (userText: string) => Promise<AIResponse | undefined>;
  startSession: (topic: Topic, level: CEFRLevel, assignmentId?: string | null) => void;  endSession: () => Promise<SessionEndResult | undefined>;  clearConversation: () => void;
  dismissProviderNotice: () => void;
  score: number;
}

interface SessionEndResult {
  ok: boolean;
  score?: number;
  durationSec?: number;
  totalUserMessages?: number;
  totalAiMessages?: number;
  evaluation?: ConversationEvaluation;
  /** Buổi bị huỷ vì học viên không nói câu nào — không chấm điểm. */
  discarded?: boolean;
  reason?: string;
  /** Đã đạt mốc tối thiểu của bài tập hay chưa. */
  meetsRequirement?: boolean;
}

interface ConversationProgress {
  userMessages: number;
  minMessages: number;
  maxUserMessages: number;
  durationSec: number;
  minDurationSec: number;
  completed: boolean;
  reachedMessageGoal: boolean;
  reachedMaxMessages: boolean;
  shouldFinish: boolean;
}

export function useConversation(): UseConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(100);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [conversationProgress, setConversationProgress] = useState<ConversationProgress | null>(null);
  const [isConversationLocked, setIsConversationLocked] = useState(false);
  const topicRef = useRef<Topic | null>(null);
  const levelRef = useRef<CEFRLevel>('A1');
  const sessionIdRef = useRef<string | null>(null);
  const historyRef = useRef<ConversationHistory[]>([]);
  const errorCountRef = useRef(0);

  const startSession = useCallback((topic: Topic, level: CEFRLevel, assignmentId?: string | null) => {
    topicRef.current = topic;
    levelRef.current = level;
    historyRef.current = [];
    errorCountRef.current = 0;
    setScore(100);
    setMessages([]);
    setError(null);
    setProviderNotice(null);
    setConversationProgress(null);
    setIsConversationLocked(false);

    // Add AI opening message
    const openingMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: topic.openingQuestion,
      timestamp: new Date(),
    };
    setMessages([openingMessage]);

    // Add to history
    historyRef.current = [
      { role: 'assistant', content: topic.openingQuestion },
    ];
    // Persist session on server (if authenticated)
    (async () => {
      try {
        const res = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId: topic.id, level, assignmentId: assignmentId || null }),
        });
        if (res.ok) {
          const data = await res.json();
          sessionIdRef.current = data.sessionId || null;
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Không thể bắt đầu bài luyện');
        }
      } catch {
        setError('Không thể bắt đầu bài luyện');
      }
    })();
  }, []);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return undefined;

    try {
      const totalUserMessages = messages.filter(msg => msg.role === 'user').length;
      const totalAiMessages = messages.filter(msg => msg.role === 'assistant').length;

      const res = await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          totalUserMessages,
          totalAiMessages,
          score,
        }),
      });
      return await res.json() as SessionEndResult;
    } catch (err) {
      console.error('Failed to end session:', err);
      return undefined;
    } finally {
      sessionIdRef.current = null;
    }
  }, [messages, score]);

  const sendMessage = useCallback(async (userText: string) => {
    if (!topicRef.current || !userText.trim() || isConversationLocked) return;

    setError(null);
    setProviderNotice(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userText.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentMessage: userText.trim(),
          topicId: topicRef.current.id,
          level: levelRef.current,
          history: historyRef.current,
          sessionId: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.conversation) {
          setConversationProgress(errData.conversation);
          setIsConversationLocked(Boolean(errData.conversation.shouldFinish));
        }
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      const json = await response.json();
      const aiData = (json.aiResponse ?? json) as AIResponse;
      const fallback = json.fallback as ProviderFallbackInfo | undefined;
      const progress = json.conversation as ConversationProgress | undefined;

      if (progress) {
        setConversationProgress(progress);
        setIsConversationLocked(progress.reachedMaxMessages);
      }

      if (fallback) {
        setProviderNotice(`Chuyển tự động từ ${fallback.from.toUpperCase()} sang ${fallback.to.toUpperCase()}. ${fallback.reason || ''}`);
      }

      // Update score
      if (aiData.correction?.hasCorrection) {
        errorCountRef.current += 1;
        const newScore = Math.max(40, 100 - errorCountRef.current * 5);
        setScore(newScore);
      }

      // Build AI message content (reply + followUpQuestion)
      const aiContent = aiData.followUpQuestion
        ? `${aiData.reply} ${aiData.followUpQuestion}`
        : aiData.reply;

      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: aiContent,
        correction: aiData.correction,
        followUpQuestion: aiData.followUpQuestion,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update history for context
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: userText.trim() },
        { role: 'assistant', content: aiContent },
      ];

      // Keep history to last 10 exchanges to avoid token overflow
      if (historyRef.current.length > 20) {
        historyRef.current = historyRef.current.slice(-20);
      }

      return aiData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isConversationLocked]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    errorCountRef.current = 0;
    setScore(100);
    setError(null);
    setProviderNotice(null);
    sessionIdRef.current = null;
    setConversationProgress(null);
    setIsConversationLocked(false);
  }, []);

  const dismissProviderNotice = useCallback(() => setProviderNotice(null), []);

  return {
    messages,
    isLoading,
    error,
    providerNotice,
    conversationProgress,
    isConversationLocked,
    sendMessage,
    startSession,
    endSession,
    clearConversation,
    dismissProviderNotice,
    score,
  };
}
