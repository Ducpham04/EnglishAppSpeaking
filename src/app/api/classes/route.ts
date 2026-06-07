import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateJoinCode } from '@/lib/join-code';
import { formatLimitError, getTeacherPlanUsage } from '@/lib/subscriptions';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.role;
  const where = role === 'admin' ? {} : { teacherId: session.user.id };
  const classes = await prisma.class.findMany({
    where,
    include: { students: true, assignments: { where: { status: 'published' } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { name, description, level } = await req.json();
  if (!name) return NextResponse.json({ error: 'Tên lớp là bắt buộc' }, { status: 400 });

  if (session.user.role === 'teacher') {
    const usage = await getTeacherPlanUsage(session.user.id);
    const classLimit = usage.plan?.classLimit;
    if (classLimit !== null && classLimit !== undefined && usage.activeClasses >= classLimit) {
      return NextResponse.json({ error: formatLimitError('class', classLimit) }, { status: 402 });
    }
  }

  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.class.findUnique({ where: { joinCode } });
    if (!existing) break;
    joinCode = generateJoinCode();
  }

  const cls = await prisma.class.create({
    data: { teacherId: session.user.id, joinCode, name: name.trim(), description: description || null, level: level || null },
  });
  return NextResponse.json(cls, { status: 201 });
}
