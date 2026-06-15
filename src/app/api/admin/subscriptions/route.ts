import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, planId, endsAt, paymentNote } = await request.json() as {
    userId?: string;
    planId?: string;
    endsAt?: string | null;
    paymentNote?: string | null;
  };

  if (!userId || !planId) {
    return NextResponse.json({ error: 'userId và planId là bắt buộc' }, { status: 400 });
  }

  const parsedEndsAt = endsAt ? new Date(endsAt) : null;
  if (parsedEndsAt && Number.isNaN(parsedEndsAt.getTime())) {
    return NextResponse.json({ error: 'Ngày hết hạn không hợp lệ' }, { status: 400 });
  }
  if (parsedEndsAt && parsedEndsAt <= new Date()) {
    return NextResponse.json({ error: 'Ngày hết hạn phải nằm trong tương lai' }, { status: 400 });
  }

  const [user, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
    prisma.plan.findUnique({ where: { id: planId }, select: { id: true, role: true, isActive: true } }),
  ]);

  if (!user) return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
  if (!plan || !plan.isActive) return NextResponse.json({ error: 'Gói không hợp lệ' }, { status: 404 });
  if (plan.role !== user.role && !(plan.role === 'school' && user.role === 'teacher')) {
    return NextResponse.json({ error: 'Gói không phù hợp với role user' }, { status: 400 });
  }

  await prisma.subscription.updateMany({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
    },
    data: {
      status: 'expired',
      endsAt: new Date(),
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId,
      status: 'active',
      startsAt: new Date(),
      endsAt: parsedEndsAt,
      activatedBy: session.user.id,
      paymentNote: paymentNote?.trim() || null,
    },
    include: { plan: true, user: { select: { id: true, name: true, email: true, role: true } } },
  });

  return NextResponse.json({ subscription }, { status: 201 });
}
