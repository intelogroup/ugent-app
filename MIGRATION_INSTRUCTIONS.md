# Database Migration Instructions

## Overview
The following new tables and models have been added to support:
- Quiz points system with difficulty multipliers and time bonuses
- Global leaderboard functionality
- AI insights generation
- Performance summary tracking
- Learning patterns analysis

## New Prisma Models

### 1. **AIInsight**
Stores AI-generated periodic insights for users
- Performance-based insights (after quizzes)
- Pattern recognition (learning styles)
- Weakness analysis (weak topics)
- Motivational messages (streaks, milestones)
- Adaptive recommendations
- Ranking comparisons

### 2. **PerformanceSummary**
Comprehensive user performance metrics
- Core metrics: accuracy, score, success rate, readiness
- Activity tracking: questions answered, tests completed, study time
- Consistency metrics: streaks, daily goals, optimal times
- Global ranking and percentile
- Growth metrics and projections
- Subject and topic mastery data

### 3. **LearningPattern**
User-specific learning behavior analysis
- Peak performance times and days
- Session duration preferences
- Difficulty-specific accuracy rates
- Error patterns and common mistakes
- Preferred learning styles

### 4. **QuestionScore**
Stores points earned per question
- Base points (10 for EASY, 20 for MEDIUM, 30 for HARD)
- Time bonus multiplier
- Streak multiplier
- Total points calculation

## How to Apply the Migration

### Option 1: Automatic Migration (Recommended)
```bash
# Make sure DATABASE_URL is set in .env.local
npx prisma migrate dev --name add_quiz_insights_leaderboard
```

### Option 2: Manual SQL
See `prisma/migrations/` folder for the generated migration SQL

### Option 3: Reset Database (Development Only)
```bash
# WARNING: This deletes all data
npx prisma migrate reset
```

## Database Changes Summary

### New Tables:
- `AIInsight` - 50-100 rows per active user over time
- `PerformanceSummary` - 1 row per user
- `LearningPattern` - 1 row per user
- `QuestionScore` - Same count as `Answer` records

### Updated Tables:
- `User` - Added relations to new models
- `Answer` - Added relation to `QuestionScore`

### Indexes Added:
```sql
CREATE INDEX idx_ai_insight_user_created ON "AIInsight"(userId, createdAt);
CREATE INDEX idx_ai_insight_type ON "AIInsight"(type);
CREATE INDEX idx_performance_summary_rank ON "PerformanceSummary"(globalRank);
CREATE INDEX idx_question_score_answer ON "QuestionScore"(answerId);
```

## Data Migration
Existing data is NOT affected. New records are only created as users:
- Submit quiz answers
- Trigger AI insight generation
- Complete tests (for performance summary updates)

## Verification

After applying the migration, verify with:
```bash
npx prisma db push
npx prisma studio  # View the database
```

## Testing

A comprehensive test suite is available at `tests/database.test.ts`:
```bash
npx ts-node tests/database.test.ts
```

Tests cover:
- Quiz points system (multipliers, bonuses)
- Leaderboard functionality
- AI insights creation and management
- Performance summary updates
- Learning pattern tracking
- High-volume data ingestion
- Complex queries

## Performance Considerations

1. **AIInsight Table**
   - Can grow to 1000s of records per user
   - Use pagination and date filters for queries
   - Consider archiving old insights (>30 days)

2. **PerformanceSummary**
   - Single record per user
   - Update frequently but efficiently
   - Useful for caching

3. **QuestionScore**
   - 1:1 with Answer records
   - Can grow very large (1000s per user)
   - Useful for leaderboard calculations

## Next Steps

1. Apply migration: `npx prisma migrate dev`
2. Run tests: `npx ts-node tests/database.test.ts`
3. Implement API endpoints (see `/api/` folder)
4. Build frontend components
5. Monitor database size and performance

## Rollback

If needed, rollback the migration:
```bash
npx prisma migrate resolve --rolled-back add_quiz_insights_leaderboard
```
