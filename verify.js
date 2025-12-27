const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const total = await prisma.question.count();
  const byDifficulty = await prisma.question.groupBy({
    by: ['difficulty'],
    _count: true,
  });

  const subjects = await prisma.subject.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { name: 'asc' },
  });

  console.log('\n=== Question Bank Status ===\n');
  console.log(`Total questions: ${total}\n`);

  console.log('By difficulty:');
  byDifficulty.forEach(d => console.log(`  ${d.difficulty}: ${d._count}`));

  console.log('\nBy subject:');
  subjects.forEach(s => {
    if (s._count.questions > 0) {
      console.log(`  ${s.name}: ${s._count.questions} questions`);
    }
  });

  await prisma.$disconnect();
}

verify();
