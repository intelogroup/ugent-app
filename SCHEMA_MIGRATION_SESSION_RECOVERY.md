# Prisma Schema Migration - Session Recovery & Incomplete Quiz Handling

## Changes to Implement

### 1. Add New Enum for Test Status
```prisma
enum TestStatus {
  ACTIVE
  PAUSED        // User disconnected but can resume
  RESUMED       // Resumed from pause
  COMPLETED     // Finished normally
  ABANDONED     // User intentionally quit
  TIMEOUT       // Inactivity timeout
  INCOMPLETE    // Completed but with missing questions
}

enum AbandonReason {
  USER_QUIT
  NETWORK_ERROR
  BROWSER_CRASH
  AUTO_TIMEOUT
  SYSTEM_ERROR
}

enum UnansweredHandling {
  SKIPPED       // Not counted in score
  INCORRECT     // Marked as wrong
  PENDING       // User can resume to answer
}
```

### 2. Update Answer Status Enum
```prisma
enum AnswerStatus {
  ANSWERED
  SKIPPED       // User explicitly skipped
  UNANSWERED    // Never answered (incomplete)
  TIMEOUT       // Auto-timeout while unanswered
  INCOMPLETE    // Marked incomplete when quiz abandoned
  MARKED_REVIEW // User flagged for review
  NOT_ANSWERED  // (Keep for backward compatibility)
}
```

### 3. Enhanced Test Model
```prisma
model Test {
  id                    String            @id @default(cuid())
  userId                String
  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Basic Info
  title                 String
  description           String?
  mode                  TestMode          @default(TUTOR)
  questionMode          QuestionMode      @default(STANDARD)
  useAI                 Boolean           @default(false)
  totalQuestions        Int
  timeLimit             Int?              // minutes

  // Selection Criteria
  selectedSubjects      String[]          // JSON array
  selectedTopics        String[]          // JSON array

  // ===== NEW FIELDS FOR SESSION RECOVERY =====

  // Session Status
  status                TestStatus        @default(ACTIVE)
  statusUpdatedAt       DateTime          @default(now())

  // Session Tracking
  sessionToken          String?           @unique  // Secure token for resume
  lastActivityAt        DateTime          @updatedAt  // Auto-updated

  // Recovery Metadata
  attemptNumber         Int               @default(1)  // How many times resumed
  maxAttempts           Int               @default(3)

  // Completion Status
  completionStatus      String            @default("ACTIVE")  // FULLY_COMPLETED, PARTIALLY_COMPLETED

  // Unanswered Handling
  abandonReason         AbandonReason?
  scoreIncompleteAs     UnansweredHandling @default(SKIPPED)
  applyIncompletePenalty Boolean          @default(false)
  incompletePenalty     Float             @default(0.9)  // 90% score

  // Question Counts
  answeredCount         Int               @default(0)
  skippedCount          Int               @default(0)
  unansweredCount       Int               @default(0)

  // Results (existing)
  score                 Float?
  totalCorrect          Int               @default(0)
  totalIncorrect        Int               @default(0)
  totalSkipped          Int               @default(0)

  // Timestamps
  startedAt             DateTime?
  pausedAt              DateTime?         // When paused
  resumedAt             DateTime?         // When resumed
  completedAt           DateTime?
  duration              Int?              // seconds

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  // Relations
  questions             TestQuestion[]
  answers               Answer[]
  sessions              TestSession[]     // Track all sessions
  statusEvents          StatusEvent[]     // Audit trail
  interactions          UserInteraction[]

  @@index([userId])
  @@index([status])
  @@index([lastActivityAt])
  @@index([sessionToken])
  @@index([createdAt])
  @@index([completedAt])
}
```

### 4. Enhanced Answer Model
```prisma
model Answer {
  id                    String            @id @default(cuid())
  userId                String
  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  testId                String
  test                  Test              @relation(fields: [testId], references: [id], onDelete: Cascade)

  questionId            String
  question              Question          @relation(fields: [questionId], references: [id], onDelete: Cascade)

  selectedOptionId       String?
  selectedOption        AnswerOption?     @relation(fields: [selectedOptionId], references: [id], onDelete: SetNull)

  // ===== NEW FIELDS FOR SESSION RECOVERY =====

  // Enhanced Status
  status                AnswerStatus      @default(NOT_ANSWERED)
  isCorrect             Boolean?
  timeSpent             Int?              // seconds

  // Answer Tracking
  answeredAt            DateTime?
  markedForReview       Boolean           @default(false)

  // Recovery Info
  attemptCount          Int               @default(1)  // How many times changed
  lastModified          DateTime          @updatedAt

  // Old fields
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  // Relations
  interactions          UserInteraction[]
  reviewHistory         ReviewHistory[]
  questionScore         QuestionScore?

  @@unique([testId, questionId])
  @@index([userId])
  @@index([testId])
  @@index([questionId])
  @@index([status])
  @@index([isCorrect])
}
```

### 5. New TestSession Model (for tracking all sessions)
```prisma
model TestSession {
  id                    String            @id @default(cuid())
  userId                String
  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  testId                String
  test                  Test              @relation(fields: [testId], references: [id])

  // Session Metadata
  sessionNumber         Int               // 1st, 2nd, 3rd attempt
  sessionToken          String?           @unique

  // Session Timeline
  startedAt             DateTime
  pausedAt              DateTime?
  resumedAt             DateTime?
  endedAt               DateTime?

  // Session State
  lastActivity          DateTime          @updatedAt
  disconnectCount       Int               @default(0)

  // Recovery Policy
  canResume             Boolean           @default(true)
  resumeDeadline        DateTime?         // Until when can resume
  resumeAttempts        Int               @default(0)
  maxResumeAttempts     Int               @default(3)

  // Device Info
  deviceType            String?           // mobile, desktop, tablet
  browser               String?
  ipAddress             String?

  // Event Tracking
  statusEvents          StatusEvent[]

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@index([userId])
  @@index([testId])
  @@index([sessionToken])
  @@index([startedAt])
}
```

### 6. New StatusEvent Model (for audit trail)
```prisma
model StatusEvent {
  id                    String            @id @default(cuid())

  sessionId             String
  session               TestSession       @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Event Details
  eventType             String            // STARTED, PAUSED, RESUMED, COMPLETED, ABANDONED, TIMEOUT
  reason                String?           // Why the event occurred

  // Context at time of event
  questionIndex         Int?              // Which question (0-indexed)
  questionsAnswered     Int?
  questionsSkipped      Int?
  questionsUnanswered   Int?

  // Recovery Info
  attemptNumber         Int?
  timeSinceStart        Int?              // seconds

  createdAt             DateTime          @default(now())

  @@index([sessionId])
  @@index([eventType])
  @@index([createdAt])
}
```

### 7. New TestPolicy Model (configuration)
```prisma
model TestPolicy {
  id                    String            @id @default(cuid())

  // Resumption Window
  resumeWindowMinutes   Int               @default(15)
  maxResumeAttempts     Int               @default(3)
  inactivityTimeoutMin  Int               @default(30)

  // Incomplete Handling
  scoreUnansweredAs     UnansweredHandling @default(SKIPPED)
  applyIncompletePenalty Boolean          @default(false)
  incompletePenalty     Float             @default(0.9)

  // Evaluation
  includeUnansweredInMastery Boolean      @default(false)
  trackAbandonmentRate  Boolean           @default(true)

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
}
```

### 8. Update QuestionScore Model
```prisma
model QuestionScore {
  id                    String            @id @default(cuid())
  answerId              String            @unique
  answer                Answer            @relation(fields: [answerId], references: [id], onDelete: Cascade)

  basePoints            Int
  difficulty            String
  timeBonus             Float             @default(1.0)
  streakMultiplier      Float             @default(1.0)
  totalPoints           Int

  // ===== NEW FIELDS FOR INCOMPLETE HANDLING =====
  isFromIncomplete      Boolean           @default(false)
  pointAdjustment       Float             @default(1.0)  // e.g., 0.9 = 10% deduction
  adjustmentReason      String?           // WHY_INCOMPLETE, WHY_TIMEOUT

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
}
```

---

## Migration Steps

### Step 1: Create Migration File
```bash
npx prisma migrate dev --name add_session_recovery_fields
```

### Step 2: Update Enums
Add new enums to schema.prisma

### Step 3: Update Existing Models
- Add new fields to Test model
- Add new fields to Answer model
- Add new fields to QuestionScore model

### Step 4: Create New Models
- TestSession
- StatusEvent
- TestPolicy

### Step 5: Add Indexes
Ensure all new fields have proper indexes for query performance

### Step 6: Backward Compatibility
- Default values ensure old data continues to work
- Status field defaults to ACTIVE
- scoreIncompleteAs defaults to SKIPPED
- applyIncompletePenalty defaults to false

---

## Migration SQL (if using raw SQL)

```sql
-- Add enum types
CREATE TYPE "TestStatus" AS ENUM ('ACTIVE', 'PAUSED', 'RESUMED', 'COMPLETED', 'ABANDONED', 'TIMEOUT', 'INCOMPLETE');
CREATE TYPE "AbandonReason" AS ENUM ('USER_QUIT', 'NETWORK_ERROR', 'BROWSER_CRASH', 'AUTO_TIMEOUT', 'SYSTEM_ERROR');
CREATE TYPE "UnansweredHandling" AS ENUM ('SKIPPED', 'INCORRECT', 'PENDING');

-- Update AnswerStatus enum
ALTER TYPE "AnswerStatus" ADD VALUE 'UNANSWERED' BEFORE 'NOT_ANSWERED';
ALTER TYPE "AnswerStatus" ADD VALUE 'TIMEOUT';
ALTER TYPE "AnswerStatus" ADD VALUE 'INCOMPLETE';
ALTER TYPE "AnswerStatus" ADD VALUE 'MARKED_REVIEW';

-- Add columns to Test table
ALTER TABLE "Test"
ADD COLUMN "status" "TestStatus" DEFAULT 'ACTIVE',
ADD COLUMN "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "sessionToken" TEXT UNIQUE,
ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "completionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "abandonReason" "AbandonReason",
ADD COLUMN "scoreIncompleteAs" "UnansweredHandling" DEFAULT 'SKIPPED',
ADD COLUMN "applyIncompletePenalty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "incompletePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
ADD COLUMN "answeredCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "skippedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unansweredCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pausedAt" TIMESTAMP(3),
ADD COLUMN "resumedAt" TIMESTAMP(3);

-- Add columns to Answer table
ALTER TABLE "Answer"
ADD COLUMN "markedForReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 1;

-- Create TestSession table
CREATE TABLE "TestSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "sessionNumber" INTEGER NOT NULL,
  "sessionToken" TEXT UNIQUE,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "pausedAt" TIMESTAMP(3),
  "resumedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnectCount" INTEGER NOT NULL DEFAULT 0,
  "canResume" BOOLEAN NOT NULL DEFAULT true,
  "resumeDeadline" TIMESTAMP(3),
  "resumeAttempts" INTEGER NOT NULL DEFAULT 0,
  "maxResumeAttempts" INTEGER NOT NULL DEFAULT 3,
  "deviceType" TEXT,
  "browser" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
  CONSTRAINT "TestSession_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE RESTRICT
);

-- Create StatusEvent table
CREATE TABLE "StatusEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "reason" TEXT,
  "questionIndex" INTEGER,
  "questionsAnswered" INTEGER,
  "questionsSkipped" INTEGER,
  "questionsUnanswered" INTEGER,
  "attemptNumber" INTEGER,
  "timeSinceStart" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StatusEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession" ("id") ON DELETE CASCADE
);

-- Create TestPolicy table
CREATE TABLE "TestPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "resumeWindowMinutes" INTEGER NOT NULL DEFAULT 15,
  "maxResumeAttempts" INTEGER NOT NULL DEFAULT 3,
  "inactivityTimeoutMin" INTEGER NOT NULL DEFAULT 30,
  "scoreUnansweredAs" "UnansweredHandling" DEFAULT 'SKIPPED',
  "applyIncompletePenalty" BOOLEAN NOT NULL DEFAULT false,
  "incompletePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
  "includeUnansweredInMastery" BOOLEAN NOT NULL DEFAULT false,
  "trackAbandonmentRate" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Add columns to QuestionScore
ALTER TABLE "QuestionScore"
ADD COLUMN "isFromIncomplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pointAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN "adjustmentReason" TEXT;

-- Create indexes
CREATE INDEX "Test_status_idx" ON "Test"("status");
CREATE INDEX "Test_lastActivityAt_idx" ON "Test"("lastActivityAt");
CREATE INDEX "Test_sessionToken_idx" ON "Test"("sessionToken");
CREATE INDEX "Answer_status_idx" ON "Answer"("status");
CREATE INDEX "TestSession_userId_idx" ON "TestSession"("userId");
CREATE INDEX "TestSession_testId_idx" ON "TestSession"("testId");
CREATE INDEX "TestSession_sessionToken_idx" ON "TestSession"("sessionToken");
CREATE INDEX "StatusEvent_sessionId_idx" ON "StatusEvent"("sessionId");
CREATE INDEX "StatusEvent_eventType_idx" ON "StatusEvent"("eventType");
```

---

## Benefits of This Schema

### 1. **Session Recovery**
- ✅ Track paused sessions with timeout
- ✅ Allow resuming from last question
- ✅ Secure with session tokens
- ✅ Limit resume attempts

### 2. **Incomplete Quiz Handling**
- ✅ Clear marking of unanswered vs skipped
- ✅ Configurable incomplete penalty
- ✅ Track abandonment reason
- ✅ Distinguish abandonment types

### 3. **Audit Trail**
- ✅ StatusEvent tracks all state changes
- ✅ Know exactly when paused/resumed
- ✅ Track disconnect counts
- ✅ Know what question was current

### 4. **Performance**
- ✅ Efficient queries with proper indexes
- ✅ Avoid N+1 problems with relations
- ✅ Quick lookup by sessionToken
- ✅ Fast status filtering

### 5. **Backward Compatibility**
- ✅ Old tests continue to work
- ✅ Default values for new fields
- ✅ No data loss
- ✅ Can migrate existing tests gradually

---

## Data Validation

After migration, add validation:

```typescript
// Server-side validation
- Ensure sessionToken is unique per user per test
- Ensure lastActivityAt is always updated
- Ensure status changes are valid transitions
- Ensure abandonReason is set when status = ABANDONED
- Ensure unansweredCount = totalQuestions - answeredCount - skippedCount

// Client-side heartbeat
- Send heartbeat every 5 seconds
- Update lastActivityAt on server
- Detect inactivity after 30 minutes
- Auto-mark as TIMEOUT if no activity
```

---

## Next Steps

1. ✅ Create this migration
2. ✅ Update Prisma client
3. ✅ Create session recovery endpoints
4. ✅ Implement heartbeat system
5. ✅ Update quiz completion logic
6. ✅ Add tests for recovery flows
