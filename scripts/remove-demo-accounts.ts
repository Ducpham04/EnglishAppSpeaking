/**
 * Xoá tài khoản demo (*@gbspeaking.com) cùng lớp/bài tập demo khỏi database.
 * Dùng khi bàn giao: DB production từng được seed bằng dữ liệu demo.
 *
 * Chạy thử (chỉ liệt kê, không xoá):
 *   DATABASE_URL='postgresql://...' npx tsx scripts/remove-demo-accounts.ts
 *
 * Xoá thật:
 *   DATABASE_URL='postgresql://...' npx tsx scripts/remove-demo-accounts.ts --apply
 */
import { prisma } from '../src/lib/prisma';

const DEMO_EMAIL_SUFFIX = '@gbspeaking.com';
const DEMO_CLASS_ID = 'class-english-b1';
const DEMO_ASSIGNMENT_ID = 'assign-travel-1';

async function main() {
  const apply = process.argv.includes('--apply');

  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
    select: { id: true, email: true, role: true, name: true },
  });

  if (demoUsers.length === 0) {
    console.log('✅ Không tìm thấy tài khoản demo nào. Database đã sạch.');
    return;
  }

  console.log(`Tìm thấy ${demoUsers.length} tài khoản demo:`);
  for (const u of demoUsers) {
    console.log(`  - ${u.role.padEnd(8)} ${u.email} | ${u.name}`);
  }

  const userIds = demoUsers.map(u => u.id);
  const sessionCount = await prisma.session.count({ where: { studentId: { in: userIds } } });
  console.log(`\nDữ liệu liên quan sẽ bị xoá theo: ${sessionCount} session luyện nói.`);

  if (!apply) {
    console.log('\n⚠️  Đây là chạy thử. Thêm --apply để xoá thật.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({ where: { id: DEMO_ASSIGNMENT_ID } });
    await tx.assignment.deleteMany({ where: { teacherId: { in: userIds } } });
    await tx.classStudent.deleteMany({ where: { studentId: { in: userIds } } });
    await tx.classStudent.deleteMany({ where: { classId: DEMO_CLASS_ID } });
    await tx.class.deleteMany({ where: { id: DEMO_CLASS_ID } });
    await tx.class.deleteMany({ where: { teacherId: { in: userIds } } });
    await tx.subscription.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const remaining = await prisma.user.count({ where: { email: { endsWith: DEMO_EMAIL_SUFFIX } } });
  console.log(`\n✅ Đã xoá xong. Tài khoản demo còn lại: ${remaining}`);
  console.log('Nhớ tạo admin thật: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run prisma:seed');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
