import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * GET /api/achievements
 * 
 * Gets user's earned achievements and available badges from Convex
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') as Id<"users"> | null;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const data = await fetchQuery(api.achievements.getUserAchievements, { userId });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/achievements/unlock
 * 
 * Manually unlocks an achievement for a user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') as Id<"users"> | null;
    const body = await request.json();
    const { achievementId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    if (!achievementId) {
      return NextResponse.json(
        { error: 'Achievement ID required' },
        { status: 400 }
      );
    }

    const result = await fetchMutation(api.achievements.unlockAchievement, { 
      userId, 
      achievementId 
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return NextResponse.json(
      { error: 'Failed to unlock achievement' },
      { status: 500 }
    );
  }
}
