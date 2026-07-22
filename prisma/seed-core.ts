import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

/**
 * Dữ liệu nền tảng bắt buộc phải có trên mọi môi trường (kể cả production):
 * danh sách chủ đề luyện nói và các gói dịch vụ.
 * Không chứa tài khoản demo — xem `prisma/seed-demo.ts` cho dữ liệu dùng thử.
 */

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

export async function seedTopics() {
  for (const t of topicsData) {
    await prisma.topic.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, isPublic: true },
    });
  }
  console.log('✅ Chủ đề luyện nói:', topicsData.length);
}

export async function seedPlans() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  console.log('✅ Gói dịch vụ:', plans.length);
}

/**
 * Tạo tài khoản admin đầu tiên từ biến môi trường ADMIN_EMAIL / ADMIN_PASSWORD.
 * Bỏ qua nếu không khai báo — không bao giờ tạo mật khẩu mặc định.
 */
export async function seedAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrator';

  if (!email || !password) {
    console.log('⏭️  Bỏ qua tạo admin (chưa đặt ADMIN_EMAIL và ADMIN_PASSWORD).');
    return;
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD phải dài tối thiểu 12 ký tự.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('ℹ️  Admin đã tồn tại, không ghi đè:', email);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'admin',
      status: 'active',
    },
  });
  console.log('✅ Tạo tài khoản admin:', email);
}
