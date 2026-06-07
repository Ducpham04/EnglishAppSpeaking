import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const accounts = [
    { email: 'admin@gbspeaking.com', password: 'admin123' },
    { email: 'teacher@gbspeaking.com', password: 'teacher123' },
    { email: 'student@gbspeaking.com', password: 'student123' },
  ];

  for (const account of accounts) {
    const user = await prisma.user.findUnique({ where: { email: account.email } });
    if (!user) {
      console.error('Missing account:', account.email);
      continue;
    }
    const valid = await bcrypt.compare(account.password, user.passwordHash);
    console.log(account.email, user.role, valid ? 'password-ok' : 'password-fail');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
