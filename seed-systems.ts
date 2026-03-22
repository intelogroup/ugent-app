// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const systems = [
  { name: 'Cardiovascular System', description: 'Heart and blood vessels', displayOrder: 1, icon: '❤️' },
  { name: 'Respiratory System', description: 'Lungs and airways', displayOrder: 2, icon: '🫁' },
  { name: 'Nervous System', description: 'Brain, spinal cord, and nerves', displayOrder: 3, icon: '🧠' },
  { name: 'Gastrointestinal System', description: 'Digestive system', displayOrder: 4, icon: '🍽️' },
  { name: 'Renal System', description: 'Kidneys and urinary system', displayOrder: 5, icon: '🫘' },
  { name: 'Endocrine System', description: 'Hormonal system', displayOrder: 6, icon: '⚡' },
  { name: 'Hematologic System', description: 'Blood and lymphatic system', displayOrder: 7, icon: '🩸' },
  { name: 'Immune System', description: 'Immune and infectious diseases', displayOrder: 8, icon: '🛡️' },
  { name: 'Musculoskeletal System', description: 'Bones, joints, and muscles', displayOrder: 9, icon: '🦴' },
  { name: 'Integumentary System', description: 'Skin and related structures', displayOrder: 10, icon: '👤' },
  { name: 'Reproductive System', description: 'Male and female reproductive organs', displayOrder: 11, icon: '👶' },
];

async function seedSystems() {
  try {
    console.log('Starting systems seed...');

    for (const system of systems) {
      const existing = await prisma.system.findUnique({
        where: { name: system.name },
      });

      if (existing) {
        console.log(`System "${system.name}" already exists, skipping...`);
      } else {
        await prisma.system.create({
          data: system,
        });
        console.log(`✓ Created system: ${system.name}`);
      }
    }

    console.log('\nSystems seed completed successfully!');
  } catch (error) {
    console.error('Systems seed failed:', error);
    throw error;
  }
}

seedSystems()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
