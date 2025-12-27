const { PrismaClient } = require('@prisma/client');

async function checkQuestions() {
  const prisma = new PrismaClient({
    log: ['query', 'error'],
  });

  try {
    console.log('Checking questions in database...\n');

    // Count total questions
    const totalQuestions = await prisma.question.count();
    console.log(`Total questions in database: ${totalQuestions}\n`);

    if (totalQuestions === 0) {
      console.log('❌ No questions found in the database!');
      console.log('You need to seed the database with questions first.\n');
    } else {
      // Get sample questions
      const sampleQuestions = await prisma.question.findMany({
        take: 5,
        include: {
          options: true,
          system: { select: { name: true } },
          topic: { select: { name: true } },
          subject: { select: { name: true } },
        },
      });

      console.log('Sample questions:');
      sampleQuestions.forEach((q, i) => {
        console.log(`\n${i + 1}. ${q.text.substring(0, 80)}...`);
        console.log(`   Difficulty: ${q.difficulty}`);
        console.log(`   Options: ${q.options.length}`);
        console.log(`   System: ${q.system?.name || 'N/A'}`);
        console.log(`   Topic: ${q.topic?.name || 'N/A'}`);
        console.log(`   Subject: ${q.subject?.name || 'N/A'}`);
      });

      // Check systems
      const systems = await prisma.system.findMany({
        select: { id: true, name: true, questionCount: true },
      });
      console.log('\n\nSystems:');
      systems.forEach(s => console.log(`  - ${s.name}: ${s.questionCount} questions`));

      // Check subjects
      const subjects = await prisma.subject.findMany({
        select: { id: true, name: true, questionCount: true },
      });
      console.log('\nSubjects:');
      subjects.forEach(s => console.log(`  - ${s.name}: ${s.questionCount} questions`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuestions();
