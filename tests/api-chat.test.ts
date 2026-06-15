import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Import the handler
import * as chatRoute from '../src/app/api/chat/route';
import { getAIResponse } from '@/lib/ai';

const mockFns = vi.hoisted(() => ({
  createMessage: vi.fn(),
  createAiUsage: vi.fn(),
  aggregateAiUsage: vi.fn(),
  findSubscription: vi.fn(),
  findTopic: vi.fn(),
  findTopicByTitle: vi.fn(),
  findSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      topic: { findUnique: mockFns.findTopic, findFirst: mockFns.findTopicByTitle },
      message: { create: mockFns.createMessage },
      aiUsageLog: { create: mockFns.createAiUsage, aggregate: mockFns.aggregateAiUsage },
      session: { findFirst: mockFns.findSession },
      subscription: { findFirst: mockFns.findSubscription },
    },
  };
});

vi.mock('@/lib/ai', () => ({
  getAIResponse: vi.fn(async () => ({
    aiResponse: {
      reply: 'Good job',
      correction: { hasCorrection: false, wrong: '', right: '', explanation: '', type: 'grammar' },
      followUpQuestion: 'What about that?',
    },
    usage: { provider: 'openai', model: 'gpt-4o-mini', inputTokens: 10, outputTokens: 20, estimatedCost: 0.00006 },
  })),
}));

vi.mock('@/lib/topics', () => ({ TOPICS: [{ id: 'topic1', title: 'T', systemPrompt: 'S' }] }));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'user1' } })),
}));

beforeEach(() => {
  mockFns.createMessage.mockReset();
  mockFns.createAiUsage.mockReset();
  mockFns.aggregateAiUsage.mockReset();
  mockFns.findSubscription.mockReset();
  mockFns.findTopic.mockReset();
  mockFns.findTopicByTitle.mockReset();
  mockFns.findSession.mockReset();
  mockFns.findTopic.mockResolvedValue(null);
  mockFns.findTopicByTitle.mockResolvedValue(null);
  mockFns.findSession.mockResolvedValue({
    id: 'sess1',
    studentId: 'user1',
    topicId: 'topic1',
    status: 'active',
    startedAt: new Date(),
    assignment: { id: 'assignment1', status: 'published', minMessages: 5, minDurationSec: 300 },
    _count: { messages: 0 },
  });
  mockFns.aggregateAiUsage.mockResolvedValue({ _sum: { inputTokens: 0, outputTokens: 0 } });
  mockFns.findSubscription.mockResolvedValue(null);
  vi.mocked(getAIResponse).mockClear();
});

describe('/api/chat POST', () => {
  it('returns structured validation errors for invalid payloads', async () => {
    const req = {
      json: async () => ({
        studentMessage: '',
        topicId: '',
        level: 'Z9',
        history: [],
      }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await chatRoute.POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.issues.length).toBeGreaterThan(0);
    expect(getAIResponse).not.toHaveBeenCalled();
  });

  it('persists messages and ai usage with estimatedCost', async () => {
    const body = {
      studentMessage: 'Hello',
      topicId: 'topic1',
      level: 'B1',
      sessionId: 'sess1',
      history: [],
    };

    // Minimal NextRequest mock
    const req = { json: async () => body, headers: new Headers() } as unknown as NextRequest;

    const res = await chatRoute.POST(req);
    // Response should include aiResponse and usage
    const json = await res.json();
    expect(json.aiResponse.reply).toBe('Good job');
    expect(json.usage.estimatedCost).toBeDefined();

    // Verify prisma create calls
    expect(mockFns.createMessage).toHaveBeenCalledTimes(2);
    expect(mockFns.createAiUsage).toHaveBeenCalledTimes(1);
    const usageCall = mockFns.createAiUsage.mock.calls[0][0];
    expect(usageCall.data.estimatedCost).toBe(0.00006);
  });

  it('blocks assignment conversations after reaching the max message limit', async () => {
    mockFns.findSession.mockResolvedValueOnce({
      id: 'sess1',
      studentId: 'user1',
      topicId: 'topic1',
      status: 'active',
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      assignment: { id: 'assignment1', status: 'published', minMessages: 5, minDurationSec: 300 },
      _count: { messages: 8 },
    });

    const req = {
      json: async () => ({
        studentMessage: 'Can I keep talking?',
        topicId: 'topic1',
        level: 'B1',
        sessionId: 'sess1',
        history: [],
      }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await chatRoute.POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.conversation.reachedMaxMessages).toBe(true);
    expect(getAIResponse).not.toHaveBeenCalled();
    expect(mockFns.createMessage).not.toHaveBeenCalled();
  });

  it('blocks authenticated assignment chat when daily quota is exhausted', async () => {
    mockFns.aggregateAiUsage
      .mockResolvedValueOnce({ _sum: { inputTokens: 60000, outputTokens: 1 } })
      .mockResolvedValueOnce({ _sum: { inputTokens: 60000, outputTokens: 1 } });

    const req = {
      json: async () => ({
        studentMessage: 'Hello',
        topicId: 'topic1',
        level: 'B1',
        sessionId: 'sess1',
        history: [],
      }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await chatRoute.POST(req);
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.quota.allowed).toBe(false);
    expect(getAIResponse).not.toHaveBeenCalled();
    expect(mockFns.createMessage).not.toHaveBeenCalled();
  });

  it('uses teacher-created database topics', async () => {
    mockFns.findTopic.mockResolvedValueOnce({
      id: 'db-topic-1',
      title: 'Teacher Topic',
      systemPrompt: 'Teacher prompt',
    });

    const req = {
      json: async () => ({
        studentMessage: 'Hello',
        topicId: 'db-topic-1',
        level: 'B1',
        history: [],
      }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await chatRoute.POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.aiResponse.reply).toBe('Good job');
    expect(mockFns.findTopic).toHaveBeenCalledWith({
      where: { id: 'db-topic-1' },
      select: { id: true, title: true, systemPrompt: true },
    });
  });
});
