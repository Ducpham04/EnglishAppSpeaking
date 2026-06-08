import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🌱 Seeding database...');

  // ===== 1. Create Users =====
  const adminPassword = await bcrypt.hash('admin123', 12);
  const teacherPassword = await bcrypt.hash('teacher123', 12);
  const studentPassword = await bcrypt.hash('student123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gbspeaking.com' },
    update: {
      name: 'Admin',
      passwordHash: adminPassword,
      role: 'admin',
      status: 'active',
    },
    create: {
      name: 'Admin',
      email: 'admin@gbspeaking.com',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@gbspeaking.com' },
    update: {
      name: 'Thầy Minh',
      passwordHash: teacherPassword,
      role: 'teacher',
      status: 'active',
    },
    create: {
      name: 'Thầy Minh',
      email: 'teacher@gbspeaking.com',
      passwordHash: teacherPassword,
      role: 'teacher',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@gbspeaking.com' },
    update: {
      name: 'Nguyễn Văn A',
      passwordHash: studentPassword,
      role: 'student',
      status: 'active',
    },
    create: {
      name: 'Nguyễn Văn A',
      email: 'student@gbspeaking.com',
      passwordHash: studentPassword,
      role: 'student',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@gbspeaking.com' },
    update: {
      name: 'Trần Thị B',
      passwordHash: studentPassword,
      role: 'student',
      status: 'active',
    },
    create: {
      name: 'Trần Thị B',
      email: 'student2@gbspeaking.com',
      passwordHash: studentPassword,
      role: 'student',
    },
  });

  console.log('✅ Users created:', admin.email, teacher.email, student.email, student2.email);

  // ===== 2. Create Topics =====
  const topicsData = [
    {
      id: 'self-introduction',
      title: 'Self Introduction',
      description: 'Practice introducing yourself in English',
      level: 'A1',
      icon: '👋',
      openingQuestion: 'Hello! What is your name?',
      systemPrompt: 'You are a friendly English speaking partner for a Vietnamese A1 beginner. Topic: Self Introduction. Use very simple words. Short sentences only. Max 1-2 sentences per reply. Be very encouraging. The student is just starting to learn English.',
    },
    {
      id: 'daily-routine',
      title: 'Daily Routine',
      description: 'Practice talking about your daily activities',
      level: 'A1',
      icon: '🌅',
      openingQuestion: 'What time do you wake up every morning?',
      systemPrompt: 'You are a friendly English speaking partner for a Vietnamese A1 beginner. Topic: Daily Routine. Use simple present tense. Common time words: morning, afternoon, evening. Use simple words like eat, sleep, go, come, work, study.',
    },
    {
      id: 'ordering-food',
      title: 'Ordering Food',
      description: 'Practice ordering food at a restaurant',
      level: 'A2',
      icon: '🍜',
      openingQuestion: 'Welcome to our restaurant! What would you like to order today?',
      systemPrompt: 'You are a friendly restaurant waiter helping an A2 English learner practice ordering food. Use polite restaurant phrases. Topics: menu items, quantities, preferences, paying the bill.',
    },
    {
      id: 'shopping',
      title: 'Shopping',
      description: 'Practice shopping conversations in English',
      level: 'A2',
      icon: '🛍️',
      openingQuestion: 'Hello! Welcome to our store. What are you looking for today?',
      systemPrompt: 'You are a helpful shop assistant helping an A2 English learner practice shopping. Topics: asking for items, sizes, colors, prices, paying.',
    },
    {
      id: 'travel-plans',
      title: 'Travel Plans',
      description: 'Practice discussing travel plans and experiences',
      level: 'B1',
      icon: '✈️',
      openingQuestion: 'Are you planning to travel anywhere soon? Where would you like to go?',
      systemPrompt: 'You are a travel enthusiast helping a B1 English learner practice travel conversations. Topics: destinations, booking, packing, sightseeing, cultural experiences.',
    },
    {
      id: 'hobbies',
      title: 'Hobbies & Interests',
      description: 'Practice talking about hobbies and free time activities',
      level: 'B1',
      icon: '🎨',
      openingQuestion: 'What do you like to do in your free time?',
      systemPrompt: 'You are a friendly conversation partner helping a B1 English learner discuss hobbies. Topics: sports, music, reading, gaming, cooking, travel.',
    },
    {
      id: 'job-interview',
      title: 'Job Interview',
      description: 'Practice common English job interview questions',
      level: 'B2',
      icon: '💼',
      openingQuestion: 'Thank you for coming in today. Can you tell me a little about yourself and your background?',
      systemPrompt: 'You are a professional interviewer helping a B2 English learner practice job interviews. Topics: work experience, strengths/weaknesses, career goals, teamwork, problem-solving.',
    },
    {
      id: 'environment',
      title: 'Environmental Issues',
      description: 'Practice discussing environmental problems and solutions',
      level: 'B2',
      icon: '🌍',
      openingQuestion: 'What do you think is the most serious environmental problem facing the world today?',
      systemPrompt: 'You are a debate partner helping a B2 English learner discuss environmental issues. Topics: climate change, pollution, renewable energy, recycling, deforestation.',
    },
    {
      id: 'technology-society',
      title: 'Technology & Society',
      description: 'Advanced discussion about technology\'s impact on society',
      level: 'C1',
      icon: '🤖',
      openingQuestion: 'How do you think artificial intelligence will change the way we work in the next decade?',
      systemPrompt: 'You are an intellectual discussion partner for a C1 English learner. Topic: Technology and Society. Discuss nuanced ideas about AI, social media, digital privacy, automation.',
    },
    {
      id: 'ethical-dilemmas',
      title: 'Ethical Dilemmas',
      description: 'Advanced discussion about ethics and moral philosophy',
      level: 'C1',
      icon: '⚖️',
      openingQuestion: 'If you had to choose between telling a difficult truth and a kind lie to protect someone\'s feelings, what would you do and why?',
      systemPrompt: 'You are a philosophy discussion partner for a C1 English learner. Topic: Ethical Dilemmas. Explore moral questions about honesty, justice, rights, consequences.',
    },
  ];

  for (const t of topicsData) {
    await prisma.topic.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, isPublic: true },
    });
  }
  console.log('✅ Topics created:', topicsData.length);

  // ===== 3. Create a Class =====
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

  // Enroll students
  await prisma.classStudent.upsert({
    where: { classId_studentId: { classId: englishClass.id, studentId: student.id } },
    update: {},
    create: { classId: englishClass.id, studentId: student.id },
  });
  await prisma.classStudent.upsert({
    where: { classId_studentId: { classId: englishClass.id, studentId: student2.id } },
    update: {},
    create: { classId: englishClass.id, studentId: student2.id },
  });
  console.log('✅ Class created with 2 students');

  // ===== 4. Create an Assignment =====
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
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      minDurationSec: 300,
      minMessages: 5,
      status: 'published',
    },
  });
  console.log('✅ Assignment created');

  // ===== 5. Commercial Plans =====
  const plans = [
    {
      code: 'free',
      name: 'Free',
      description: 'Dùng thử cho học viên cá nhân',
      role: 'student',
      priceVnd: 0,
      dailyTokenLimit: 15000,
      monthlyTokenLimit: 120000,
      monthlySessionLimit: 5,
      featuresJson: JSON.stringify(['Luyện nói AI cơ bản', 'Feedback tự động']),
    },
    {
      code: 'student-plus',
      name: 'Student Plus',
      description: 'Học viên luyện đều mỗi ngày',
      role: 'student',
      priceVnd: 199000,
      dailyTokenLimit: 60000,
      monthlyTokenLimit: 1200000,
      monthlySessionLimit: 100,
      featuresJson: JSON.stringify(['Luyện nói AI', 'Lịch sử & tiến độ', 'Chấm điểm chi tiết']),
    },
    {
      code: 'teacher-starter',
      name: 'Teacher Starter',
      description: 'Giáo viên quản lý lớp nhỏ',
      role: 'teacher',
      priceVnd: 299000,
      dailyTokenLimit: 120000,
      monthlyTokenLimit: 2500000,
      monthlySessionLimit: 300,
      classLimit: 3,
      studentLimit: 50,
      assignmentLimit: 100,
      featuresJson: JSON.stringify(['Tạo lớp', 'Giao bài AI', 'Theo dõi tiến độ', 'Yêu cầu luyện lại']),
    },
    {
      code: 'teacher-class',
      name: 'Teacher Class',
      description: 'Giáo viên/nhóm lớp dùng thường xuyên',
      role: 'teacher',
      priceVnd: 599000,
      dailyTokenLimit: 300000,
      monthlyTokenLimit: 6000000,
      monthlySessionLimit: 1000,
      classLimit: 10,
      studentLimit: 200,
      assignmentLimit: 500,
      featuresJson: JSON.stringify(['Tất cả tính năng Teacher Starter', 'Quota cao hơn', 'Nhiều lớp hơn']),
    },
  ];

  const teacherStarter = await prisma.plan.upsert({
    where: { code: 'teacher-starter' },
    update: plans.find(plan => plan.code === 'teacher-starter')!,
    create: plans.find(plan => plan.code === 'teacher-starter')!,
  });

  for (const plan of plans.filter(plan => plan.code !== 'teacher-starter')) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }

  const existingTeacherSubscription = await prisma.subscription.findFirst({
    where: { userId: teacher.id, status: 'active' },
  });
  if (!existingTeacherSubscription) {
    await prisma.subscription.create({
      data: {
        userId: teacher.id,
        planId: teacherStarter.id,
        status: 'active',
        paymentNote: 'Seed demo teacher plan',
      },
    });
  }
  console.log('✅ Plans seeded:', plans.length);

  console.log('\n🎉 Seeding complete!\n');
  console.log('Test accounts:');
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
