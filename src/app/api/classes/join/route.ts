import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { normalizeJoinCode } from '@/lib/join-code';
import { prisma } from '@/lib/prisma';
import { formatLimitError, getTeacherPlanUsage } from '@/lib/subscriptions';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'student' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ học viên mới có thể tham gia lớp' }, { status: 403 });
  }

  const { joinCode } = await req.json() as { joinCode?: string };
  const code = normalizeJoinCode(joinCode || '');
  if (code.length < 4) {
    return NextResponse.json({ error: 'Mã lớp không hợp lệ' }, { status: 400 });
  }

  const cls = await prisma.class.findUnique({
    where: { joinCode: code },
    include: {
      teacher: { select: { name: true, email: true } },
      students: { where: { studentId: session.user.id } },
    },
  });

  if (!cls || cls.status !== 'active') {
    return NextResponse.json({ error: 'Không tìm thấy lớp đang mở với mã này' }, { status: 404 });
  }

  if (cls.students.length > 0) {
    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        teacher: cls.teacher,
      },
      alreadyJoined: true,
    });
  }

  const teacherUsage = await getTeacherPlanUsage(cls.teacherId);
  const studentLimit = teacherUsage.plan?.studentLimit;
  if (studentLimit !== null && studentLimit !== undefined && teacherUsage.activeStudents >= studentLimit) {
    return NextResponse.json({ error: formatLimitError('student', studentLimit) }, { status: 402 });
  }

  await prisma.classStudent.create({
    data: {
      classId: cls.id,
      studentId: session.user.id,
    },
  });

  return NextResponse.json({
    class: {
      id: cls.id,
      name: cls.name,
      level: cls.level,
      teacher: cls.teacher,
    },
    alreadyJoined: false,
  }, { status: 201 });
}
