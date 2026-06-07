import { prisma } from '@/lib/prisma';

export type ActiveSubscriptionWithPlan = Awaited<ReturnType<typeof getActiveSubscription>>;

export function startOfCurrentMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
      OR: [
        { endsAt: null },
        { endsAt: { gt: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });
}

export function getDaysUntil(date: Date | null | undefined) {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function getTeacherPlanUsage(teacherId: string) {
  const monthStart = startOfCurrentMonth();
  const [activeSubscription, activeClasses, activeStudents, activeAssignments, monthlySessions] = await Promise.all([
    getActiveSubscription(teacherId),
    prisma.class.count({ where: { teacherId, status: 'active' } }),
    prisma.classStudent.count({
      where: {
        status: 'active',
        class: { teacherId, status: 'active' },
      },
    }),
    prisma.assignment.count({
      where: {
        teacherId,
        status: { not: 'archived' },
      },
    }),
    prisma.session.count({
      where: {
        createdAt: { gte: monthStart },
        assignment: { teacherId },
      },
    }),
  ]);

  return {
    activeSubscription,
    plan: activeSubscription?.plan ?? null,
    activeClasses,
    activeStudents,
    activeAssignments,
    monthlySessions,
  };
}

export async function getStudentPlanUsage(studentId: string) {
  const monthStart = startOfCurrentMonth();
  const [activeSubscription, monthlySessions] = await Promise.all([
    getActiveSubscription(studentId),
    prisma.session.count({
      where: {
        studentId,
        createdAt: { gte: monthStart },
      },
    }),
  ]);

  return {
    activeSubscription,
    plan: activeSubscription?.plan ?? null,
    monthlySessions,
  };
}

export function formatLimitError(kind: 'class' | 'student' | 'assignment' | 'session', limit: number) {
  const label = {
    class: 'số lớp',
    student: 'số học viên',
    assignment: 'số bài tập',
    session: 'số phiên luyện tập tháng này',
  }[kind];

  return `Gói hiện tại đã đạt giới hạn ${label} (${limit}). Vui lòng liên hệ admin để nâng cấp gói.`;
}
