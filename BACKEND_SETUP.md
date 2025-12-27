# UGent App - Data-Heavy Backend Setup Guide

This guide explains the comprehensive data-heavy backend architecture with user interaction tracking implemented for the UGent medical education platform.

## Architecture Overview

The backend is built on **Next.js API Routes** with **PostgreSQL + Prisma ORM** for a data-intensive system that tracks every user interaction.

### Key Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                   │
│         - Create Test UI (with tracking hooks)           │
│         - Quiz Interface (with interaction tracking)     │
│         - Analytics Dashboard                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│            Next.js API Routes (Backend)                  │
│  ┌────────────┬─────────────┬──────────────────┐         │
│  │  Tests API │ Questions   │ Interactions API │         │
│  │  /api/...  │ /api/...    │ /api/...         │         │
│  └────────────┴─────────────┴──────────────────┘         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│           Prisma ORM (Data Layer)                        │
│  - Connection pooling                                    │
│  - Type-safe queries                                    │
│  - Automatic migrations                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│         PostgreSQL Database                              │
│  - Users, Tests, Questions                              │
│  - Answer tracking, Progress metrics                    │
│  - User Interactions (DATA HEAVY)                       │
│  - Performance analytics                                │
└─────────────────────────────────────────────────────────┘
```

## Database Setup

### Prerequisites

- PostgreSQL 13+ installed and running
- Node.js 18+

### Step 1: Install PostgreSQL (Mac)

```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Create default database
createdb ugent_dev

# Verify installation
psql ugent_dev
```

### Step 2: Configure Environment Variables

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ugent_dev"

# NextAuth (when implemented)
NEXTAUTH_URL="http://localhost:3005"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3005"
```

### Step 3: Install Prisma

```bash
npm install @prisma/client prisma
```

### Step 4: Initialize Prisma

```bash
npx prisma init

# This creates:
# - prisma/schema.prisma (database schema)
# - .env.local (environment variables)
```

### Step 5: Run Migrations

```bash
# Create and apply migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

### Step 6: Seed the Database (Optional)

```bash
npx prisma db seed
```

## Database Schema Overview

### Core Tables

#### 1. **User Management**
- `User` - Student profiles with authentication
- `UserLeaderboard` - Cached user statistics for rankings

#### 2. **Content Management**
- `System` - Medical systems (26 systems: Cardiovascular, CNS, etc.)
- `Topic` - Topics within systems (nested structure)
- `Subject` - Foundational subjects (Anatomy, Physiology, etc.)
- `Question` - Question bank with difficulty levels
- `AnswerOption` - Multiple choice options

#### 3. **Test Management**
- `Test` - User test sessions with configuration
- `TestQuestion` - Junction table linking tests to questions
- `Answer` - Individual question responses
- `TestSession` - Continuous session tracking

#### 4. **User Interaction Tracking (DATA HEAVY)**
- `UserInteraction` - Every action a user takes
  - Question views
  - Answer submissions
  - Test starts/completions
  - Time spent tracking
  - Device/browser information
  - IP addresses for analytics

#### 5. **Progress & Analytics**
- `Progress` - Mastery tracking per system/topic/subject
- `StudyNote` - User-created notes with tags
- `ReviewHistory` - Question review attempts with confidence ratings
- `LearningPath` - Personalized learning goals

## API Endpoints

### Test Management

#### Create Test
```
POST /api/tests/create
Body: {
  userId: string
  subjects: number[]
  topics: number[]
  questionCount: number
  testMode: 'TUTOR' | 'TIMED'
  questionMode: 'STANDARD' | 'CUSTOM' | 'PRACTICE'
  useAI: boolean
}
Response: { test: Test }
```

#### Submit Answer
```
POST /api/tests/submit-answer
Body: {
  userId: string
  testId: string
  questionId: string
  selectedOptionId?: string
  timeSpent?: number
}
Response: { answer: Answer, isCorrect: boolean }
```

### Questions

#### Get Questions
```
GET /api/questions?limit=50&offset=0&difficulty=MEDIUM&systemId=x&topicId=y
Response: { questions: Question[], total: number }
```

#### Create Question
```
POST /api/questions
Body: {
  text: string
  explanation: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  systemId?: string
  topicId?: string
  subjectId?: string
  options: Array<{ text: string, isCorrect: boolean }>
}
Response: { question: Question }
```

### User Analytics

#### Get User Analytics
```
GET /api/users/analytics?userId=x
Response: {
  user: User
  statistics: {
    totalTests: number
    completedTests: number
    totalQuestionsAnswered: number
    totalCorrectAnswers: number
    overallSuccessRate: number
    averageScore: number
  }
  progress: Progress[]
  recentInteractions: UserInteraction[]
  mostReviewedQuestions: any[]
}
```

### Interaction Tracking

#### Track Interaction
```
POST /api/interactions/track
Body: {
  userId: string
  actionType: string (e.g., 'question_view', 'answer_submit', 'test_start')
  entityType: string (e.g., 'question', 'test', 'system')
  entityId?: string
  testId?: string
  questionId?: string
  answerId?: string
  metadata?: object
  durationMs?: number
}
Response: { interaction: UserInteraction }
```

## Interaction Tracking System

The app tracks **every user interaction** to build a comprehensive learning profile.

### Tracked Actions

```typescript
// Test interactions
'test_created' - User creates a new test
'test_started' - User starts taking a test
'test_paused' - User pauses a test
'test_resumed' - User resumes a test
'test_completed' - User completes a test
'test_submitted' - User submits test results

// Question interactions
'question_viewed' - User views a question
'question_skipped' - User skips a question
'question_reviewed' - User reviews a question explanation

// Answer interactions
'answer_submitted' - User submits an answer
'answer_changed' - User changes their answer
'answer_reviewed' - User reviews their answer

// System interactions
'system_viewed' - User browses a system
'topic_expanded' - User expands topic list
'topic_selected' - User selects a topic

// Session interactions
'session_started' - Session begins
'session_ended' - Session ends
'window_focused' - User returns focus to window
'window_blurred' - User loses focus
```

### What Gets Tracked

For each interaction, we store:
- **Temporal**: When the action occurred (timestamp)
- **Performance**: How long the action took (durationMs)
- **Context**: What test/question/topic was involved
- **Device**: Browser, device type, IP address
- **Results**: Correctness, time spent, confidence level
- **Metadata**: Custom data for specific action types

## Frontend Integration

### Using Test API Hook

```typescript
import { useTestAPI } from '@/lib/hooks/useTestAPI';

const { createTest, submitAnswer } = useTestAPI();

// Create test
const { test } = await createTest({
  userId: 'user-123',
  subjects: [1, 2],
  topics: [101, 102, 103],
  questionCount: 20,
  testMode: 'TUTOR',
  questionMode: 'STANDARD',
  useAI: true,
});

// Submit answer
const { answer, isCorrect } = await submitAnswer({
  userId: 'user-123',
  testId: test.id,
  questionId: 'q-456',
  selectedOptionId: 'opt-789',
  timeSpent: 45, // seconds
});
```

### Using Interaction Tracking Hook

```typescript
import { useInteractionTracking } from '@/lib/hooks/useInteractionTracking';

const { trackInteraction, startTracking, endTracking } = useInteractionTracking({
  userId: 'user-123',
  testId: 'test-456',
  questionId: 'q-789',
});

// Track a simple interaction
await trackInteraction('question_viewed', 'question', 'q-789', {
  difficulty: 'MEDIUM',
  topic: 'Cardiovascular',
});

// Track timed interactions
startTracking();
// ... user answers question
endTracking('answer_submitted', 'answer', 'answer-123', {
  selectedOption: 'A',
  confidence: 4,
});
```

## Data Analysis Capabilities

With this comprehensive tracking system, you can analyze:

### User Learning Patterns
- Time spent per system/topic
- Success rates by difficulty level
- Learning curve and progression
- Question review frequency
- Time between attempts on same question

### Performance Metrics
- Overall accuracy and success rate
- Mastery level per system
- Weak areas that need focus
- Strengths to leverage
- Learning velocity

### Engagement Metrics
- Daily/weekly activity
- Session duration and frequency
- Focus/blur events (distraction tracking)
- Device usage patterns
- Time of day analytics

### AI/ML Opportunities
- Recommend questions based on weak areas
- Predict test performance
- Personalize difficulty progression
- Detect confusion (multiple wrong attempts)
- Optimize learning path

## Performance Considerations

### Database Optimization

1. **Indexing** - All frequently queried fields have indexes:
   - userId, testId, questionId
   - createdAt for time-based queries
   - actionType, entityType for interaction filtering

2. **Pagination** - Questions/interactions use offset/limit:
   ```typescript
   GET /api/questions?limit=50&offset=0
   ```

3. **Efficient Queries**:
   - Use `select` to fetch only needed fields
   - Use `include` for related data
   - Group queries with `Promise.all()`

4. **Connection Pooling** - Prisma manages automatically

### Frontend Optimization

1. **Async Tracking** - Interactions tracked in background
2. **Batching** - Multiple interactions can be batch-sent
3. **Debouncing** - Avoid tracking every keystroke
4. **Caching** - Cache user stats to reduce queries

## Development Workflow

### 1. Make Schema Changes
```bash
# Edit prisma/schema.prisma
# Create migration
npx prisma migrate dev --name add_new_field
```

### 2. Deploy Schema
```bash
# Applies migration to development database
# Generates Prisma Client automatically
```

### 3. Add API Route
```bash
# Create new route in app/api/...
# Use `prisma` client from 'lib/prisma'
```

### 4. Update Frontend
```bash
# Use hooks from lib/hooks/
# Track interactions
```

## Monitoring & Debugging

### View Database State
```bash
# Open Prisma Studio (web UI for database)
npx prisma studio
```

### View Generated SQL
```prisma
// Add log config to schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  log      = ["query", "info", "warn", "error"]
}
```

### Reset Database (Development Only)
```bash
# ⚠️ WARNING: Deletes all data
npx prisma migrate reset
```

## Production Deployment

### Environment Variables
```env
DATABASE_URL="postgresql://user:pass@prod-host:5432/ugent_prod"
NEXTAUTH_URL="https://ugent.app"
NEXTAUTH_SECRET="secure-random-string"
NODE_ENV="production"
```

### Deployment Steps
```bash
# 1. Run migrations on production
npm run prisma:migrate:deploy

# 2. Generate Prisma Client
npm run build

# 3. Start production server
npm run start
```

### Backup Strategy
```bash
# Regular PostgreSQL backups
pg_dump ugent_prod > backup_$(date +%Y%m%d).sql

# Restore from backup
psql ugent_prod < backup_20240101.sql
```

## Troubleshooting

### Connection Issues
```bash
# Test PostgreSQL connection
psql -U postgres -d ugent_dev -c "SELECT 1"

# Check DATABASE_URL
echo $DATABASE_URL
```

### Migration Conflicts
```bash
# Reset to clean state (development only)
npx prisma migrate reset

# Or manually resolve conflicts
npx prisma migrate resolve --rolled-back init
```

### Prisma Client Issues
```bash
# Regenerate Prisma Client
npx prisma generate

# Clear cache
rm -rf node_modules/.prisma
npm install
```

## Next Steps

1. **Set up PostgreSQL** - Follow database setup steps above
2. **Initialize Prisma** - Run migrations to create schema
3. **Implement NextAuth** - Add user authentication
4. **Create Seed Script** - Populate with medical questions/systems
5. **Connect Frontend** - Update create-test page to use API endpoints
6. **Monitor Analytics** - Track user interactions and analyze patterns

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Prisma Studio](https://www.prisma.io/studio)
