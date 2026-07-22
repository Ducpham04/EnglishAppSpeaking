import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  authSession: null as null | { user: { id: string; role: string } },
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  planFindUnique: vi.fn(),
  subscriptionFindFirst: vi.fn(),
  subscriptionUpdateMany: vi.fn(),
  subscriptionCreate: vi.fn(),
  classCount: vi.fn(),
  classFindUnique: vi.fn(),
  classFindFirst: vi.fn(),
  classUpdate: vi.fn(),
  classDelete: vi.fn(),
  classStudentCreate: vi.fn(),
  classStudentCount: vi.fn(),
  classStudentFindFirst: vi.fn(),
  classStudentUpdate: vi.fn(),
  assignmentCount: vi.fn(),
  assignmentFindUnique: vi.fn(),
  assignmentFindFirst: vi.fn(),
  assignmentCreate: vi.fn(),
  assignmentUpdate: vi.fn(),
  assignmentDelete: vi.fn(),
  topicFindFirst: vi.fn(),
  topicFindUnique: vi.fn(),
  topicUpdate: vi.fn(),
  topicDelete: vi.fn(),
  sessionCount: vi.fn(),
  sessionCreate: vi.fn(),
  sessionFindFirst: vi.fn(),
  sessionUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => state.authSession),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: state.userFindUnique,
      findFirst: state.userFindFirst,
      create: state.userCreate,
    },
    plan: {
      findUnique: state.planFindUnique,
    },
    subscription: {
      findFirst: state.subscriptionFindFirst,
      updateMany: state.subscriptionUpdateMany,
      create: state.subscriptionCreate,
    },
    class: {
      count: state.classCount,
      findUnique: state.classFindUnique,
      findFirst: state.classFindFirst,
      update: state.classUpdate,
      delete: state.classDelete,
    },
    classStudent: {
      count: state.classStudentCount,
      create: state.classStudentCreate,
      findFirst: state.classStudentFindFirst,
      update: state.classStudentUpdate,
    },
    assignment: {
      count: state.assignmentCount,
      findUnique: state.assignmentFindUnique,
      findFirst: state.assignmentFindFirst,
      create: state.assignmentCreate,
      update: state.assignmentUpdate,
      delete: state.assignmentDelete,
    },
    topic: {
      findFirst: state.topicFindFirst,
      findUnique: state.topicFindUnique,
      update: state.topicUpdate,
      delete: state.topicDelete,
    },
    session: {
      count: state.sessionCount,
      create: state.sessionCreate,
      findFirst: state.sessionFindFirst,
      update: state.sessionUpdate,
    },
  },
}));

vi.mock('@/lib/topics', () => ({
  TOPICS: [{ id: 'travel-plans', title: 'Travel Plans' }],
}));

vi.mock('@/lib/ai', () => ({
  evaluateConversation: vi.fn(async () => ({
    overallScore: 88,
    taskScore: 90,
    fluencyScore: 86,
    grammarScore: 84,
    vocabularyScore: 88,
    coherenceScore: 90,
    summary: 'Bạn làm tốt.',
    strengths: ['Phản hồi đúng ngữ cảnh.'],
    improvements: ['Nói đầy đủ câu hơn.'],
    importantNotes: ['Chú ý thì động từ.'],
    suggestedSentences: [],
  })),
}));

import * as registerRoute from '../src/app/api/auth/register/route';
import * as classJoinRoute from '../src/app/api/classes/join/route';
import * as adminSubscriptionsRoute from '../src/app/api/admin/subscriptions/route';
import * as classDetailRoute from '../src/app/api/classes/[id]/route';
import * as classStudentRoute from '../src/app/api/classes/[id]/students/[studentId]/route';
import * as assignmentDetailRoute from '../src/app/api/assignments/[id]/route';
import * as assignmentStudentRetryRoute from '../src/app/api/assignments/[id]/students/[studentId]/retry/route';
import * as assignmentsRoute from '../src/app/api/assignments/route';
import * as teacherTopicDetailRoute from '../src/app/api/teacher/topics/[id]/route';
import * as sessionStartRoute from '../src/app/api/sessions/start/route';
import * as sessionEndRoute from '../src/app/api/sessions/end/route';
import { evaluateConversation } from '@/lib/ai';

function jsonRequest(body: unknown) {
  return { json: async () => body } as unknown as NextRequest;
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function classStudentParams(id: string, studentId: string) {
  return { params: Promise.resolve({ id, studentId }) };
}

beforeEach(() => {
  state.authSession = null;
  state.userFindUnique.mockReset();
  state.userFindFirst.mockReset();
  state.userCreate.mockReset();
  state.planFindUnique.mockReset();
  state.subscriptionFindFirst.mockReset();
  state.subscriptionUpdateMany.mockReset();
  state.subscriptionCreate.mockReset();
  state.classCount.mockReset();
  state.classFindUnique.mockReset();
  state.classFindFirst.mockReset();
  state.classUpdate.mockReset();
  state.classDelete.mockReset();
  state.classStudentCreate.mockReset();
  state.classStudentCount.mockReset();
  state.classStudentFindFirst.mockReset();
  state.classStudentUpdate.mockReset();
  state.assignmentCount.mockReset();
  state.assignmentFindUnique.mockReset();
  state.assignmentFindFirst.mockReset();
  state.assignmentCreate.mockReset();
  state.assignmentUpdate.mockReset();
  state.assignmentDelete.mockReset();
  state.topicFindFirst.mockReset();
  state.topicFindUnique.mockReset();
  state.topicUpdate.mockReset();
  state.topicDelete.mockReset();
  state.sessionCount.mockReset();
  state.sessionCreate.mockReset();
  state.sessionFindFirst.mockReset();
  state.sessionUpdate.mockReset();
  state.subscriptionFindFirst.mockResolvedValue(null);
  state.classCount.mockResolvedValue(0);
  state.classStudentCount.mockResolvedValue(0);
  state.assignmentCount.mockResolvedValue(0);
  state.sessionCount.mockResolvedValue(0);
});

describe('production API role and system flows', () => {
  it('registers new users as students and rejects duplicates', async () => {
    state.userFindFirst.mockResolvedValueOnce(null);
    state.userCreate.mockImplementationOnce(async ({ data }) => ({
      id: 'user-new',
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      passwordHash: data.passwordHash,
    }));

    const created = await registerRoute.POST(jsonRequest({
      name: 'New Student',
      email: 'new@example.com',
      password: 'secret123',
    }));
    const createdJson = await created.json();

    expect(created.status).toBe(201);
    expect(createdJson.role).toBe('student');
    expect(state.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'new@example.com',
        phone: null,
        role: 'student',
        passwordHash: expect.not.stringMatching(/^secret123$/),
      }),
    }));

    state.userFindFirst.mockResolvedValueOnce({ id: 'existing', email: 'new@example.com' });
    const duplicate = await registerRoute.POST(jsonRequest({
      name: 'New Student',
      email: 'new@example.com',
      password: 'secret123',
    }));

    expect(duplicate.status).toBe(409);
  });

  it('registers students with phone number when email is unavailable', async () => {
    state.userFindFirst.mockResolvedValueOnce(null);
    state.userCreate.mockImplementationOnce(async ({ data }) => ({
      id: 'user-phone',
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      passwordHash: data.passwordHash,
    }));

    const created = await registerRoute.POST(jsonRequest({
      name: 'Phone Student',
      phone: '0912 345 678',
      password: 'secret123',
    }));
    const createdJson = await created.json();

    expect(created.status).toBe(201);
    expect(createdJson.phone).toBe('0912345678');
    expect(state.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: null,
        phone: '0912345678',
        role: 'student',
      }),
    }));
  });

  it('lets admins manually activate a teacher subscription', async () => {
    state.authSession = { user: { id: 'admin-1', role: 'admin' } };
    state.userFindUnique.mockResolvedValueOnce({ id: 'teacher-1', role: 'teacher' });
    state.planFindUnique.mockResolvedValueOnce({ id: 'plan-teacher', role: 'teacher', isActive: true });
    state.subscriptionUpdateMany.mockResolvedValueOnce({ count: 1 });
    state.subscriptionCreate.mockResolvedValueOnce({ id: 'sub-1', status: 'active' });

    const res = await adminSubscriptionsRoute.POST(jsonRequest({
      userId: 'teacher-1',
      planId: 'plan-teacher',
      paymentNote: 'Bank transfer confirmed',
    }));

    expect(res.status).toBe(201);
    expect(state.subscriptionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'teacher-1',
      }),
      data: expect.objectContaining({
        status: 'expired',
      }),
    }));
    expect(state.subscriptionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'teacher-1',
        planId: 'plan-teacher',
        status: 'active',
        activatedBy: 'admin-1',
        paymentNote: 'Bank transfer confirmed',
      }),
    }));
  });

  it('lets students join active classes by normalized join code and blocks teachers', async () => {
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.classFindUnique.mockResolvedValueOnce({
      id: 'class-1',
      name: 'B1 Speaking',
      level: 'B1',
      status: 'active',
      teacher: { name: 'Teacher', email: 'teacher@example.com' },
      students: [],
    });
    state.classStudentCreate.mockResolvedValueOnce({ id: 'enrollment-1' });

    const joined = await classJoinRoute.POST(jsonRequest({ joinCode: ' b1-demo ' }));
    const joinedJson = await joined.json();

    expect(joined.status).toBe(201);
    expect(joinedJson.alreadyJoined).toBe(false);
    expect(state.classFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { joinCode: 'B1DEMO' },
    }));
    expect(state.classStudentCreate).toHaveBeenCalledWith({
      data: { classId: 'class-1', studentId: 'student-1' },
    });

    state.authSession = { user: { id: 'teacher-1', role: 'teacher' } };
    const blocked = await classJoinRoute.POST(jsonRequest({ joinCode: 'B1DEMO' }));

    expect(blocked.status).toBe(403);
  });

  it('lets teachers update classes and pause enrolled students', async () => {
    state.authSession = { user: { id: 'teacher-1', role: 'teacher' } };
    state.classFindFirst.mockResolvedValueOnce({
      id: 'class-1',
      teacherId: 'teacher-1',
      students: [{ id: 'enrollment-1' }],
      assignments: [],
    });
    state.classUpdate.mockResolvedValueOnce({ id: 'class-1', name: 'Updated B1', status: 'active' });

    const updatedClass = await classDetailRoute.PATCH(jsonRequest({
      name: ' Updated B1 ',
      level: 'B1',
    }), routeParams('class-1'));

    expect(updatedClass.status).toBe(200);
    expect(state.classUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'class-1' },
      data: expect.objectContaining({
        name: 'Updated B1',
        level: 'B1',
      }),
    }));

    state.classFindFirst.mockResolvedValueOnce({ id: 'class-1' });
    state.classStudentFindFirst.mockResolvedValueOnce({ id: 'enrollment-1' });
    state.classStudentUpdate.mockResolvedValueOnce({ id: 'enrollment-1', status: 'inactive' });

    const removed = await classStudentRoute.DELETE(jsonRequest({}), classStudentParams('class-1', 'student-1'));

    expect(removed.status).toBe(200);
    expect(state.classStudentUpdate).toHaveBeenCalledWith({
      where: { id: 'enrollment-1' },
      data: { status: 'inactive' },
    });
  });

  it('enforces assignment access for enrolled students and class-owning teachers', async () => {
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.assignmentFindUnique.mockResolvedValueOnce({
      id: 'assignment-1',
      teacherId: 'teacher-1',
      class: { students: [{ studentId: 'student-1' }] },
    });

    const studentAllowed = await assignmentDetailRoute.GET(jsonRequest({}), routeParams('assignment-1'));
    expect(studentAllowed.status).toBe(200);

    state.assignmentFindUnique.mockResolvedValueOnce({
      id: 'assignment-1',
      teacherId: 'teacher-1',
      class: { students: [] },
    });

    const studentBlocked = await assignmentDetailRoute.GET(jsonRequest({}), routeParams('assignment-1'));
    expect(studentBlocked.status).toBe(403);

    state.authSession = { user: { id: 'teacher-2', role: 'teacher' } };
    state.assignmentFindUnique.mockResolvedValueOnce({
      id: 'assignment-1',
      teacherId: 'teacher-1',
      class: { students: [] },
    });

    const teacherBlocked = await assignmentDetailRoute.GET(jsonRequest({}), routeParams('assignment-1'));
    expect(teacherBlocked.status).toBe(403);
  });

  it('only lets teachers create assignments for their own classes', async () => {
    state.authSession = { user: { id: 'teacher-1', role: 'teacher' } };
    state.classFindFirst.mockResolvedValueOnce(null);

    const missingClass = await assignmentsRoute.POST(jsonRequest({
      classId: 'class-foreign',
      topicId: 'topic-1',
      title: 'Practice',
    }));

    expect(missingClass.status).toBe(404);

    state.classFindFirst.mockResolvedValueOnce({ id: 'class-1' });
    state.topicFindUnique.mockResolvedValueOnce({ id: 'topic-1', isPublic: true, createdById: null });
    state.assignmentCreate.mockResolvedValueOnce({ id: 'assignment-1' });

    const created = await assignmentsRoute.POST(jsonRequest({
      classId: 'class-1',
      topicId: 'topic-1',
      title: ' Practice ',
      minDurationSec: 99999,
      minMessages: 999,
    }));

    expect(created.status).toBe(201);
    expect(state.topicFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'topic-1' },
    }));
    expect(state.assignmentCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        classId: 'class-1',
        topicId: 'topic-1',
        teacherId: 'teacher-1',
        title: 'Practice',
        minDurationSec: 1800,
        minMessages: 20,
        status: 'published',
      }),
    }));
  });

  it('blocks assignment creation with forbidden private topics', async () => {
    state.authSession = { user: { id: 'teacher-1', role: 'teacher' } };
    state.classFindFirst.mockResolvedValueOnce({ id: 'class-1' });
    state.topicFindUnique.mockResolvedValueOnce({ id: 'topic-private', isPublic: false, createdById: 'teacher-2' });

    const blocked = await assignmentsRoute.POST(jsonRequest({
      classId: 'class-1',
      topicId: 'topic-private',
      title: 'Practice',
    }));

    expect(blocked.status).toBe(403);
    expect(state.assignmentCreate).not.toHaveBeenCalled();
  });

  it('blocks teachers when their plan assignment limit is reached', async () => {
    state.authSession = { user: { id: 'teacher-1', role: 'teacher' } };
    state.subscriptionFindFirst.mockResolvedValueOnce({
      plan: {
        classLimit: 3,
        studentLimit: 50,
        assignmentLimit: 1,
        monthlySessionLimit: 300,
      },
    });
    state.assignmentCount.mockResolvedValueOnce(1);

    const blocked = await assignmentsRoute.POST(jsonRequest({
      classId: 'class-1',
      topicId: 'topic-1',
      title: 'Practice',
    }));

    expect(blocked.status).toBe(402);
    expect(state.classFindFirst).not.toHaveBeenCalled();
    expect(state.assignmentCreate).not.toHaveBeenCalled();
  });

  it('blocks class joins when the teacher plan student limit is reached', async () => {
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.classFindUnique.mockResolvedValueOnce({
      id: 'class-1',
      teacherId: 'teacher-1',
      name: 'B1 Speaking',
      level: 'B1',
      status: 'active',
      teacher: { name: 'Teacher', email: 'teacher@example.com' },
      students: [],
    });
    state.subscriptionFindFirst.mockResolvedValueOnce({
      plan: {
        classLimit: 3,
        studentLimit: 1,
        assignmentLimit: 100,
        monthlySessionLimit: 300,
      },
    });
    state.classStudentCount.mockResolvedValueOnce(1);

    const blocked = await classJoinRoute.POST(jsonRequest({ joinCode: 'B1DEMO' }));

    expect(blocked.status).toBe(402);
    expect(state.classStudentCreate).not.toHaveBeenCalled();
  });

  it('lets teachers update their own topics and blocks deleting used topics', async () => {
    state.authSession = { user: { id: 'teacher-1', role: 'teacher' } };
    state.topicFindFirst.mockResolvedValueOnce({
      id: 'topic-1',
      createdById: 'teacher-1',
      _count: { assignments: 0, sessions: 0 },
    });
    state.topicUpdate.mockResolvedValueOnce({
      id: 'topic-1',
      title: 'Updated topic',
      isPublic: false,
      _count: { assignments: 0, sessions: 0 },
    });

    const updated = await teacherTopicDetailRoute.PATCH(jsonRequest({
      title: ' Updated topic ',
      isPublic: false,
    }), routeParams('topic-1'));

    expect(updated.status).toBe(200);
    expect(state.topicUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'topic-1' },
      data: expect.objectContaining({
        title: 'Updated topic',
        isPublic: false,
      }),
    }));

    state.topicFindFirst.mockResolvedValueOnce({
      id: 'topic-used',
      createdById: 'teacher-1',
      _count: { assignments: 1, sessions: 0 },
    });

    const blockedDelete = await teacherTopicDetailRoute.DELETE(jsonRequest({}), routeParams('topic-used'));

    expect(blockedDelete.status).toBe(409);
    expect(state.topicDelete).not.toHaveBeenCalled();
  });

  it('lets teachers update and safely delete their own assignments', async () => {
    state.authSession = { user: { id: 'teacher-1', role: 'teacher' } };

    state.assignmentFindFirst.mockResolvedValueOnce(null);
    const foreignUpdate = await assignmentDetailRoute.PATCH(jsonRequest({
      title: 'Updated',
    }), routeParams('assignment-foreign'));
    expect(foreignUpdate.status).toBe(404);

    state.assignmentFindFirst.mockResolvedValueOnce({
      id: 'assignment-1',
      teacherId: 'teacher-1',
      classId: 'class-1',
      topicId: 'topic-1',
      sessions: [],
    });
    state.assignmentUpdate.mockResolvedValueOnce({ id: 'assignment-1', title: 'Updated' });

    const updated = await assignmentDetailRoute.PATCH(jsonRequest({
      title: 'Updated',
      minMessages: 8,
    }), routeParams('assignment-1'));
    expect(updated.status).toBe(200);
    expect(state.assignmentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'assignment-1' },
      data: expect.objectContaining({
        title: 'Updated',
        minMessages: 8,
      }),
    }));

    state.assignmentFindFirst.mockResolvedValueOnce({
      id: 'assignment-empty',
      teacherId: 'teacher-1',
      sessions: [],
    });
    state.assignmentDelete.mockResolvedValueOnce({ id: 'assignment-empty' });

    const deleted = await assignmentDetailRoute.DELETE(jsonRequest({}), routeParams('assignment-empty'));
    const deletedJson = await deleted.json();
    expect(deleted.status).toBe(200);
    expect(deletedJson.deleted).toBe(true);
    expect(state.assignmentDelete).toHaveBeenCalledWith({ where: { id: 'assignment-empty' } });

    state.assignmentFindFirst.mockResolvedValueOnce({
      id: 'assignment-with-sessions',
      teacherId: 'teacher-1',
      sessions: [{ id: 'session-1' }],
    });
    state.assignmentUpdate.mockResolvedValueOnce({ id: 'assignment-with-sessions', status: 'archived' });

    const archived = await assignmentDetailRoute.DELETE(jsonRequest({}), routeParams('assignment-with-sessions'));
    const archivedJson = await archived.json();
    expect(archived.status).toBe(200);
    expect(archivedJson.archived).toBe(true);
    expect(state.assignmentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'assignment-with-sessions' },
      data: { status: 'archived' },
    }));
  });

  it('lets teachers request assignment retry for a completed student session', async () => {
    state.authSession = { user: { id: 'teacher-1', role: 'teacher' } };
    state.assignmentFindFirst.mockResolvedValueOnce({ id: 'assignment-1' });
    state.sessionFindFirst.mockResolvedValueOnce({ id: 'session-completed' });
    state.sessionUpdate.mockResolvedValueOnce({ id: 'session-completed', status: 'needs_retry' });

    const retry = await assignmentStudentRetryRoute.POST(
      jsonRequest({}),
      classStudentParams('assignment-1', 'student-1')
    );

    expect(retry.status).toBe(200);
    expect(state.assignmentFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'assignment-1',
        teacherId: 'teacher-1',
      }),
    }));
    expect(state.sessionUpdate).toHaveBeenCalledWith({
      where: { id: 'session-completed' },
      data: { status: 'needs_retry' },
    });
  });

  it('starts assignment sessions only for enrolled students and matching topics', async () => {
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.assignmentFindFirst.mockResolvedValueOnce(null);

    const notEnrolled = await sessionStartRoute.POST(jsonRequest({
      topicId: 'topic-1',
      level: 'B1',
      assignmentId: 'assignment-1',
    }));

    expect(notEnrolled.status).toBe(404);

    state.assignmentFindFirst.mockResolvedValueOnce({ topicId: 'topic-expected' });
    state.topicFindUnique.mockResolvedValueOnce({ id: 'topic-other' });

    const mismatch = await sessionStartRoute.POST(jsonRequest({
      topicId: 'topic-other',
      level: 'B1',
      assignmentId: 'assignment-1',
    }));

    expect(mismatch.status).toBe(400);

    state.assignmentFindFirst.mockResolvedValueOnce({ topicId: 'topic-expected' });
    state.topicFindUnique.mockResolvedValueOnce({ id: 'topic-expected' });
    state.sessionFindFirst.mockResolvedValueOnce(null);
    state.sessionCreate.mockResolvedValueOnce({ id: 'session-1' });

    const started = await sessionStartRoute.POST(jsonRequest({
      topicId: 'topic-expected',
      level: 'B1',
      assignmentId: 'assignment-1',
    }));
    const startedJson = await started.json();

    expect(started.status).toBe(200);
    expect(startedJson.sessionId).toBe('session-1');
    expect(state.sessionCreate).toHaveBeenCalledWith({
      data: {
        studentId: 'student-1',
        topicId: 'topic-expected',
        level: 'B1',
        assignmentId: 'assignment-1',
      },
    });
  });

  it('does not start a new assignment session after completion', async () => {
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.assignmentFindFirst.mockResolvedValueOnce({ topicId: 'topic-expected' });
    state.topicFindUnique.mockResolvedValueOnce({ id: 'topic-expected' });
    state.sessionFindFirst.mockResolvedValueOnce({ id: 'session-done', status: 'completed' });

    const res = await sessionStartRoute.POST(jsonRequest({
      topicId: 'topic-expected',
      level: 'B1',
      assignmentId: 'assignment-1',
    }));

    expect(res.status).toBe(409);
    expect(state.sessionCreate).not.toHaveBeenCalled();
  });

  it('blocks students when their monthly session limit is reached', async () => {
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.topicFindUnique.mockResolvedValueOnce({ id: 'topic-expected' });
    state.subscriptionFindFirst.mockResolvedValueOnce({
      plan: {
        monthlySessionLimit: 1,
      },
    });
    state.sessionCount.mockResolvedValueOnce(1);

    const res = await sessionStartRoute.POST(jsonRequest({
      topicId: 'topic-expected',
      level: 'B1',
    }));

    expect(res.status).toBe(402);
    expect(state.sessionCreate).not.toHaveBeenCalled();
  });

  it('ends only the authenticated student own session', async () => {
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.sessionFindFirst.mockResolvedValueOnce(null);

    const foreignSession = await sessionEndRoute.POST(jsonRequest({
      sessionId: 'session-foreign',
      totalUserMessages: 3,
      totalAiMessages: 3,
      score: 90,
    }));

    expect(foreignSession.status).toBe(404);
    expect(state.sessionUpdate).not.toHaveBeenCalled();

    const startedAt = new Date(Date.now() - 360_000);
    state.sessionFindFirst.mockResolvedValueOnce({
      id: 'session-1',
      startedAt,
      level: 'B1',
      topic: { title: 'Travel Plans' },
      assignment: { title: 'Practice', instruction: 'Talk clearly', minMessages: 3, minDurationSec: 300 },
      messages: [
        { role: 'user', corrections: null },
        { role: 'user', corrections: null },
        { role: 'user', corrections: null },
        { role: 'assistant', corrections: JSON.stringify({ hasCorrection: true }) },
        { role: 'assistant', corrections: JSON.stringify({ hasCorrection: false }) },
        { role: 'assistant', corrections: null },
      ],
    });
    state.sessionUpdate.mockResolvedValueOnce({ id: 'session-1' });

    const ended = await sessionEndRoute.POST(jsonRequest({
      sessionId: 'session-1',
      totalUserMessages: 3,
      totalAiMessages: 3,
      score: 90,
    }));

    expect(ended.status).toBe(200);
    expect(state.sessionFindFirst).toHaveBeenLastCalledWith({
      where: { id: 'session-1', studentId: 'student-1' },
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
    expect(state.sessionUpdate).toHaveBeenCalledTimes(1);
    expect(state.sessionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalUserMessages: 3,
        totalAiMessages: 3,
        score: 88,
        taskScore: 90,
        fluencyScore: 86,
        grammarScore: 84,
        vocabularyScore: 88,
        coherenceScore: 90,
        status: 'completed',
      }),
    }));
  });

  it('không chấm điểm buổi luyện mà học viên không nói câu nào', async () => {
    const evaluateConversationMock = vi.mocked(evaluateConversation);
    evaluateConversationMock.mockClear();
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.sessionFindFirst.mockResolvedValueOnce({
      id: 'session-empty',
      startedAt: new Date(Date.now() - 20_000),
      level: 'B1',
      topic: { title: 'Travel Plans' },
      assignment: { title: 'Practice', instruction: 'Talk', minMessages: 5, minDurationSec: 300 },
      messages: [{ role: 'assistant', corrections: null }],
    });
    state.sessionUpdate.mockResolvedValueOnce({ id: 'session-empty' });

    const response = await sessionEndRoute.POST(jsonRequest({
      sessionId: 'session-empty',
      totalUserMessages: 0,
      totalAiMessages: 1,
      score: 100,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.discarded).toBe(true);
    expect(body.reason).toBe('no_speech');
    expect(body.score).toBeUndefined();
    // Không gọi AI đánh giá khi không có gì để đánh giá.
    expect(evaluateConversationMock).not.toHaveBeenCalled();
    expect(state.sessionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'abandoned', totalUserMessages: 0 }),
    }));
  });

  it('không đánh dấu hoàn thành khi buổi luyện chưa đạt mốc tối thiểu', async () => {
    state.authSession = { user: { id: 'student-1', role: 'student' } };
    state.sessionFindFirst.mockResolvedValueOnce({
      id: 'session-short',
      startedAt: new Date(Date.now() - 60_000),
      level: 'B1',
      topic: { title: 'Travel Plans' },
      assignment: { title: 'Practice', instruction: 'Talk', minMessages: 5, minDurationSec: 300 },
      messages: [
        { role: 'user', corrections: null },
        { role: 'user', corrections: null },
        { role: 'assistant', corrections: null },
      ],
    });
    state.sessionUpdate.mockResolvedValueOnce({ id: 'session-short' });

    const response = await sessionEndRoute.POST(jsonRequest({
      sessionId: 'session-short',
      totalUserMessages: 2,
      totalAiMessages: 1,
      score: 90,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meetsRequirement).toBe(false);
    // Vẫn lưu điểm để học viên xem lại, chỉ là chưa tính hoàn thành bài tập.
    expect(typeof body.score).toBe('number');
    expect(state.sessionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'incomplete' }),
    }));
  });
});
