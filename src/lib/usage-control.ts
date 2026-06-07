import { prisma } from '@/lib/prisma';
import { getActiveSubscription } from '@/lib/subscriptions';

export type UsageLimitResult = {
  allowed: boolean;
  reason?: string;
  dailyTokens: number;
  monthlyTokens: number;
  dailyLimit: number;
  monthlyLimit: number;
  planCode?: string;
  planName?: string;
  resetAt: string;
};

function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function getUsageLimits() {
  return {
    dailyUserTokens: envInt('AI_DAILY_USER_TOKEN_LIMIT', 60_000),
    monthlyUserTokens: envInt('AI_MONTHLY_USER_TOKEN_LIMIT', 1_200_000),
    dailyWarningPercent: envInt('AI_DAILY_WARNING_PERCENT', 80),
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

export async function checkUserUsageLimit(userId: string): Promise<UsageLimitResult> {
  const envLimits = getUsageLimits();
  const activeSubscriptionPromise = getActiveSubscription(userId);

  const [activeSubscription, daily, monthly] = await Promise.all([
    activeSubscriptionPromise,
    prisma.aiUsageLog.aggregate({
      where: { userId, createdAt: { gte: startOfToday() } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.aiUsageLog.aggregate({
      where: { userId, createdAt: { gte: startOfMonth() } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
  ]);
  const dailyLimit = activeSubscription?.plan.dailyTokenLimit ?? envLimits.dailyUserTokens;
  const monthlyLimit = activeSubscription?.plan.monthlyTokenLimit ?? envLimits.monthlyUserTokens;

  const dailyTokens = (daily._sum.inputTokens ?? 0) + (daily._sum.outputTokens ?? 0);
  const monthlyTokens = (monthly._sum.inputTokens ?? 0) + (monthly._sum.outputTokens ?? 0);

  if (dailyTokens >= dailyLimit) {
    return {
      allowed: false,
      reason: 'Bạn đã dùng hết quota AI hôm nay. Vui lòng quay lại vào ngày mai hoặc liên hệ giáo viên/admin.',
      dailyTokens,
      monthlyTokens,
      dailyLimit,
      monthlyLimit,
      planCode: activeSubscription?.plan.code,
      planName: activeSubscription?.plan.name,
      resetAt: startOfTomorrow().toISOString(),
    };
  }

  if (monthlyTokens >= monthlyLimit) {
    return {
      allowed: false,
      reason: 'Tài khoản đã dùng hết quota AI tháng này. Vui lòng liên hệ admin để nâng hạn mức.',
      dailyTokens,
      monthlyTokens,
      dailyLimit,
      monthlyLimit,
      planCode: activeSubscription?.plan.code,
      planName: activeSubscription?.plan.name,
      resetAt: startOfMonth().toISOString(),
    };
  }

  return {
    allowed: true,
    dailyTokens,
    monthlyTokens,
    dailyLimit,
    monthlyLimit,
    planCode: activeSubscription?.plan.code,
    planName: activeSubscription?.plan.name,
    resetAt: startOfTomorrow().toISOString(),
  };
}

export function getUsageWarning(limit: UsageLimitResult) {
  const warningPercent = getUsageLimits().dailyWarningPercent;
  const percent = limit.dailyLimit > 0 ? Math.round((limit.dailyTokens / limit.dailyLimit) * 100) : 0;
  if (percent < warningPercent) return null;
  return `Bạn đã dùng ${percent}% quota AI hôm nay. Hãy hoàn thành bài hiện tại trước khi bắt đầu bài mới.`;
}
