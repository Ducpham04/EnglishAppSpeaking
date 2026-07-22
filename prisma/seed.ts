import { prisma } from '../src/lib/prisma';
import { seedAdminFromEnv, seedPlans, seedTopics } from './seed-core';

/**
 * Seed cho môi trường thật. Chỉ nạp dữ liệu nền tảng, không tạo tài khoản demo.
 * Tài khoản admin đầu tiên lấy từ ADMIN_EMAIL / ADMIN_PASSWORD.
 * Cần dữ liệu dùng thử (lớp, học viên mẫu): chạy `npm run prisma:seed:demo`.
 */
async function main() {
  console.log('🌱 Seeding dữ liệu nền tảng...');
  await seedTopics();
  await seedPlans();
  await seedAdminFromEnv();
  console.log('\n🎉 Hoàn tất.\n');
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
