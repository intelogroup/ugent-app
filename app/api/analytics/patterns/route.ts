import { NextRequest, NextResponse } from 'next/server';
import { aiPatternService } from '@/lib/services/aiPatternService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'DISEASE'; // DISEASE, CLUE, SUBJECT, SYSTEM
    const limit = parseInt(searchParams.get('limit') || '20');

    const patterns = await aiPatternService.getTopPatterns(type, limit);

    return NextResponse.json({
      patterns,
      type,
      limit,
    });
  } catch (error) {
    console.error('Error fetching pattern analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch pattern analytics' }, { status: 500 });
  }
}
