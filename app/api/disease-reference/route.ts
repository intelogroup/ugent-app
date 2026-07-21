import { NextResponse } from 'next/server';
import { getDiseaseReference } from '@/lib/curriculum/disease-reference';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getDiseaseReference();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load disease reference', details: String(error) },
      { status: 500 },
    );
  }
}
