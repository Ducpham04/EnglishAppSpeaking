import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { seedPlans, seedTopics } from './seed-core';

/**
 * Dữ liệu demo: tài khoản mẫu, lớp học và bài tập mẫu.
 * CHỈ dùng cho môi trường phát triển và chạy test E2E.
 * Từ chối chạy khi NODE_ENV=production trừ khi đặt ALLOW_DEMO_SEED=1.
 */
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== '1') {
    throw new Error(
      'Từ chối seed dữ liệu demo trên production. Đặt ALLOW_DEMO_SEED=1 nếu thực sự muốn.'
    );
  }

  console.log('🌱 Seeding dữ liệu demo...');
  await seedTopics();
  await seedPlans();

  const adminPassword = await bcrypt.hash('admin123', 12);
  const teacherPassword = await bcrypt.hash('teacher123', 12);
  const studentPassword = await bcrypt.hash('student123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gbspeaking.com' },
    update: { name: 'Admin', passwordHash: adminPassword, role: 'admin', status: 'active' },
    create: { name: 'Admin', email: 'admin@gbspeaking.com', passwordHash: adminPassword, role: 'admin' },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@gbspeaking.com' },
    update: { name: 'Thầy Minh', passwordHash: teacherPassword, role: 'teacher', status: 'active' },
    create: { name: 'Thầy Minh', email: 'teacher@gbspeaking.com', passwordHash: teacherPassword, role: 'teacher' },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@gbspeaking.com' },
    update: { name: 'Nguyễn Văn A', passwordHash: studentPassword, role: 'student', status: 'active' },
    create: { name: 'Nguyễn Văn A', email: 'student@gbspeaking.com', passwordHash: studentPassword, role: 'student' },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@gbspeaking.com' },
    update: { name: 'Trần Thị B', passwordHash: studentPassword, role: 'student', status: 'active' },
    create: { name: 'Trần Thị B', email: 'student2@gbspeaking.com', passwordHash: studentPassword, role: 'student' },
  });

  console.log('✅ Tài khoản demo:', admin.email, teacher.email, student.email, student2.email);

  const englishClass = await prisma.class.upsert({
    where: { id: 'class-english-b1' },
    update: { joinCode: 'B1DEMO' },
    create: {
      id: 'class-english-b1',
      teacherId: teacher.id,
      joinCode: 'B1DEMO',
      name: 'English B1 — Giao tiếp cơ bản',
      description: 'Lớp luyện nói tiếng Anh B1 dành cho người đi làm. Tập trung vào giao tiếp hàng ngày.',
      level: 'B1',
    },
  });

  for (const s of [student, student2]) {
    await prisma.classStudent.upsert({
      where: { classId_studentId: { classId: englishClass.id, studentId: s.id } },
      update: {},
      create: { classId: englishClass.id, studentId: s.id },
    });
  }
  console.log('✅ Lớp demo với 2 học viên');

  await prisma.assignment.upsert({
    where: { id: 'assign-travel-1' },
    update: {},
    create: {
      id: 'assign-travel-1',
      classId: englishClass.id,
      topicId: 'travel-plans',
      teacherId: teacher.id,
      title: 'Bài tập 1: Nói về kế hoạch du lịch',
      instruction: 'Hãy nói chuyện với AI về kế hoạch du lịch của bạn. Nói tối thiểu 5 câu và luyện ít nhất 5 phút.',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      minDurationSec: 300,
      minMessages: 5,
      status: 'published',
    },
  });
  console.log('✅ Bài tập demo');

  const teacherStarter = await prisma.plan.findUnique({ where: { code: 'teacher-starter' } });
  const existingTeacherSubscription = await prisma.subscription.findFirst({
    where: { userId: teacher.id, status: 'active' },
  });
  if (teacherStarter && !existingTeacherSubscription) {
    await prisma.subscription.create({
      data: {
        userId: teacher.id,
        planId: teacherStarter.id,
        status: 'active',
        paymentNote: 'Seed demo teacher plan',
      },
    });
  }

  console.log('\n🎉 Seed demo hoàn tất!\n');
  console.log('Tài khoản demo (KHÔNG dùng cho production):');
  console.log('  Admin:   admin@gbspeaking.com / admin123');
  console.log('  Teacher: teacher@gbspeaking.com / teacher123');
  console.log('  Student: student@gbspeaking.com / student123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
