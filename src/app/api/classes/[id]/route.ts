import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateJoinCode } from '@/lib/join-code';

const CLASS_STATUSES = new Set(['active', 'archived']);

async function generateUniqueJoinCode() {
  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await prisma.class.findUnique({ where: { joinCode } });
    if (!existing) return joinCode;
    joinCode = generateJoinCode();
  }
  return joinCode;
}

async function findOwnedClass(id: string, userId: string, role: string) {
  return prisma.class.findFirst({
    where: {
      id,
      ...(role === 'admin' ? {} : { teacherId: userId }),
    },
    include: {
      students: true,
      assignments: true,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cls = await findOwnedClass(id, session.user.id, session.user.role);
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

  const body = await request.json();
  const { name, description, level, status, regenerateJoinCode } = body as {
    name?: string;
    description?: string | null;
    level?: string | null;
    status?: string;
    regenerateJoinCode?: boolean;
  };

  if (name !== undefined && name.trim().length === 0) {
    return NextResponse.json({ error: 'Tên lớp không được để trống' }, { status: 400 });
  }
  if (status !== undefined && !CLASS_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Trạng thái lớp không hợp lệ' }, { status: 400 });
  }

  const joinCode = regenerateJoinCode ? await generateUniqueJoinCode() : undefined;
  const updated = await prisma.class.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(level !== undefined ? { level: level?.trim() || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(joinCode ? { joinCode } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cls = await findOwnedClass(id, session.user.id, session.user.role);
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

  if (cls.students.length > 0 || cls.assignments.length > 0) {
    const archived = await prisma.class.update({
      where: { id },
      data: { status: 'archived' },
    });
    return NextResponse.json({ deleted: false, archived: true, class: archived });
  }

  await prisma.class.delete({ where: { id } });
  return NextResponse.json({ deleted: true, archived: false });
}
