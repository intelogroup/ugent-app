const { PrismaClient } = require('@prisma/client');

async function testPrismaUser() {
  const prisma = new PrismaClient({
    log: ['query', 'error'],
  });

  try {
    console.log('Checking what Prisma can see...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    console.log('Users found by Prisma:');
    console.log(users);
    console.log(`\nTotal count: ${users.length}`);

    // Try to find the specific user
    if (users.length > 0) {
      const userId = users[0].id;
      console.log(`\nTrying to find user by ID: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        console.log('✅ User found via findUnique');
        console.log(user);
      } else {
        console.log('❌ User NOT found via findUnique (this is the problem!)');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaUser();
