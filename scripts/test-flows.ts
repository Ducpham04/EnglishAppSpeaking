import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔎 Checking class enrollments for class-english-b1');
  const enrollments = await prisma.classStudent.findMany({ where: { classId: 'class-english-b1' }, include: { student: true } });
  console.log('Enrolled students:', enrollments.map(e => e.student.email));

  if (enrollments.length === 0) {
    console.log('No students enrolled — seeding may have failed.');
    process.exit(1);
  }

  const student = enrollments[0].student;
  console.log(`Creating a session for student ${student.email}...`);
  const session = await prisma.session.create({ data: { studentId: student.id, topicId: 'travel-plans', level: 'B1' } });
  console.log('Created session id:', session.id);

  console.log('Updating session with score and completion...');
  const updated = await prisma.session.update({ where: { id: session.id }, data: { score: 88, status: 'completed', endedAt: new Date(), durationSec: 360, totalUserMessages: 8, totalAiMessages: 8 } });

  console.log('Updated session:', { id: updated.id, score: updated.score, status: updated.status, durationSec: updated.durationSec });

  // verify student average
  const avg = await prisma.session.aggregate({ where: { studentId: student.id, score: { not: null } }, _avg: { score: true } });
  console.log('Student average score now:', avg._avg.score);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
