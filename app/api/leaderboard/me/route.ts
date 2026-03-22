import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * GET /api/leaderboard/me
 *
 * Gets current user's rank and nearby competitors using Convex
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Fetch user rank and stats from Convex
    const result = await fetchQuery(api.leaderboard.getMyRank, { 
      userId: userId as Id<"users"> 
    });

    if (!result || !result.userRank) {
      return NextResponse.json(
        { error: 'User rank not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching user rank from Convex:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user rank' },
      { status: 500 }
    );
  }
}
