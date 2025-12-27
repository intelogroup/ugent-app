import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const systems = await prisma.system.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        topics: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ systems });
  } catch (error) {
    console.error('Error fetching systems:', error);
    return NextResponse.json({ error: 'Failed to fetch systems' }, { status: 500 });
  }
}
