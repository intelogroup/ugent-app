import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

/**
 * GET /api/leaderboard
 * 
 * Retrieves global rankings with filtering options from Convex
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'overall';
    const difficulty = searchParams.get('difficulty') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    // In current leaderboard design, timeframe and difficulty are placeholders
    // as the leaderboard table aggregates all user performance data.
    const result = await fetchQuery(api.leaderboard.getGlobalLeaderboard, { 
      limit, 
      offset 
    });

    return NextResponse.json({
      ...result,
      timeframe,
      difficulty,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
