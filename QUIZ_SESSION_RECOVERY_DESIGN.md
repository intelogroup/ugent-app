# Quiz Session Recovery & Incomplete Quiz Handling

## Problem Statement

Current system doesn't handle:
1. **Mid-Quiz Disconnections** - User loses internet/closes tab while taking test
2. **Browser Crashes** - Session state lost
3. **Session Timeout** - User inactive for too long
4. **Abandoned Quizzes** - User closes without submitting
5. **Incomplete Evaluations** - No clear policy on unanswered questions
6. **Data Integrity** - How to treat skipped vs. unanswered questions

---

## Key Questions to Resolve

### 1. **Incomplete Quiz Policy**
- Should unanswered questions count as **INCORRECT** or **SKIPPED**?
- Should they impact the score differently?
- Should users be able to resume and answer later?
- Time window for resuming a quiz?

### 2. **Session Recovery**
- If user disconnects, can they **resume the exact same quiz**?
- How long should an interrupted session be **kept alive**?
- Should we distinguish between **graceful exit** vs **forceful disconnect**?
- What about **multiple reconnections**?

### 3. **Evaluation Fairness**
- If quiz is abandoned at Q5/Q20, should Q6-Q20 count as:
  - Option A: SKIPPED (no penalty, not counted in stats)
  - Option B: INCORRECT (penalty, counted as wrong)
  - Option C: PARTIAL (counted differently in scoring)
  - Option D: User choice to abandon vs. system timeout

### 4. **Data Tracking**
- Should we track **session interruptions**?
- Should we track **question skip patterns**?
- Should incomplete quizzes show in user's **test history**?
- How does this affect **mastery calculations**?

---

## Proposed Solution Architecture

### Database Schema Improvements

#### Enhanced Test Model
```prisma
model Test {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])

  // Quiz Configuration
  title           String
  mode            String    // TUTOR, TIMED
  questionMode    String    // STANDARD, CUSTOM, PRACTICE
  totalQuestions  Int
  timeLimit       Int?      // minutes

  // Session Tracking
  status          String    // ACTIVE, PAUSED, RESUMED, COMPLETED, ABANDONED, TIMEOUT
  startedAt       DateTime
  completedAt     DateTime?
  pausedAt        DateTime?

  // Recovery & Resumption
  sessionToken    String?   @unique  // For secure session recovery
  lastActivityAt  DateTime  @default(now())  // Track last interaction
  attemptNumber   Int       @default(1)  // How many times resumed
  maxAttempts     Int       @default(3)  // Max resume attempts

  // Completion Tracking
  answeredCount   Int       @default(0)
  skippedCount    Int       @default(0)
  totalAnswered   Int       @default(0)
  abandonReason   String?   // DISCONNECT, TIMEOUT, USER_QUIT, NETWORK_ERROR

  // Evaluation Settings
  scoreIncomplete Boolean   @default(true)  // Score unanswered as wrong?
  unansweredAs    String    @default("SKIPPED")  // SKIPPED, INCORRECT, PENDING

  questions       TestQuestion[]
  answers         Answer[]
  sessions        TestSession[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  @@index([status])
  @@index([lastActivityAt])
  @@unique([userId, id, sessionToken])  // Unique session recovery
}

model Answer {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])

  testId          String
  test            Test      @relation(fields: [testId], references: [id])

  questionId      String
  question        Question  @relation(fields: [questionId], references: [id])

  selectedOptionId String?
  selectedOption  AnswerOption? @relation(fields: [selectedOptionId], references: [id])

  // Answer Status
  status          String    // ANSWERED, SKIPPED, UNANSWERED, TIMEOUT, INCOMPLETE
  isCorrect       Boolean?
  timeSpent       Int?      // seconds

  // Tracking
  answeredAt      DateTime?
  markedForReview Boolean   @default(false)
  flaggedReason   String?

  // Recovery Info
  attemptCount    Int       @default(1)  // How many times answered
  lastModified    DateTime  @updatedAt

  questionScore   QuestionScore?

  @@unique([testId, questionId])
  @@index([userId])
  @@index([testId])
  @@index([status])
}

model TestSession {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])

  testId          String
  test            Test      @relation(fields: [testId], references: [id])

  // Session Info
  sessionNumber   Int       // 1st attempt, 2nd attempt, etc.
  sessionToken    String?   @unique  // For recovery

  // Connection Tracking
  startedAt       DateTime
  pausedAt        DateTime?
  resumedAt       DateTime?
  endedAt         DateTime?

  // Interruption Info
  disconnectCount Int       @default(0)
  lastActivity    DateTime  @updatedAt

  // Device/Network Info
  deviceType      String?   // mobile, desktop, tablet
  browser         String?
  ipAddress       String?

  // Recovery Policy
  canResume       Boolean   @default(true)
  resumeDeadline  DateTime?  // Until when can be resumed
  resumeAttempts  Int       @default(0)
  maxResumeAttempts Int     @default(3)

  statusEvents    StatusEvent[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  @@index([testId])
  @@index([sessionToken])
  @@index([startedAt])
}

model StatusEvent {
  id              String    @id @default(cuid())
  sessionId       String
  session         TestSession @relation(fields: [sessionId], references: [id])

  // Event Tracking
  eventType       String    // STARTED, PAUSED, RESUMED, COMPLETED, ABANDONED, TIMEOUT, NETWORK_ERROR
  reason          String?

  // Context
  questionIndex   Int?      // Which question when event happened
  questionsAnswered Int?
  questionsSkipped  Int?

  // Recovery Attempt
  attemptNumber   Int?
  timeSinceStart  Int?      // seconds

  createdAt       DateTime  @default(now())

  @@index([sessionId])
  @@index([eventType])
  @@index([createdAt])
}

model QuestionScore {
  id              String    @id @default(cuid())
  answerId        String    @unique
  answer          Answer    @relation(fields: [answerId], references: [id])

  basePoints      Int
  difficulty      String
  timeBonus       Float     @default(1.0)
  streakMultiplier Float    @default(1.0)
  totalPoints     Int

  // Incomplete Handling
  isFromIncomplete Boolean   @default(false)  // Marked as incomplete
  pointAdjustment  Float     @default(1.0)   // 0.5 = 50% deduction
  adjustmentReason String?   // WHY_INCOMPLETE, WHY_TIMEOUT, etc.

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## Recovery Workflow

### Scenario 1: Mid-Quiz Disconnect

```
User taking Q8/Q20
↓
Network disconnects (or browser closes)
↓
System detects last activity was 5 mins ago
↓
Test marked as PAUSED (not ABANDONED yet)
↓
User returns within 15 minutes
↓
GET /api/tests/:id/resume
↓
Return current state: Q8/Q20, resume from Q8
↓
User can continue answering Q8-Q20
↓
POST /api/tests/:id/complete
↓
Q1-Q7: Already answered (use existing answers)
Q8-Q20: Just answered (use new answers)
↓
Score calculated for Q1-Q20
```

### Scenario 2: Quiz Abandoned (No Resumption)

```
User takes Q1-Q10/Q20, then closes browser
↓
No activity for 30 minutes
↓
Test status changes: PAUSED → ABANDONED (or TIMEOUT)
↓
System auto-completes quiz with:
   - Q1-Q10: Use answered status
   - Q11-Q20: Mark as UNANSWERED (or INCORRECT based on policy)
↓
Score calculated based on policy
↓
Test stored in history (marked as INCOMPLETE)
```

### Scenario 3: Explicit Resume Request

```
User clicks "Resume Quiz" button in dashboard
↓
GET /api/tests/:id/resume
↓
Return:
{
  "canResume": true,
  "lastQuestion": 8,
  "questionsAnswered": 7,
  "questionsSkipped": 1,
  "timeRemaining": 85  // minutes
  "sessionToken": "abc123..."
}
↓
User continues from Q8
```

---

## Updated API Endpoints

### 1. Pause Quiz (Graceful Exit)
```typescript
POST /api/tests/:id/pause
Request: { reason?: "USER_QUIT" | "NETWORK_ERROR" | "AUTO_TIMEOUT" }
Response: {
  success: true,
  test: {
    id, status: "PAUSED", lastActivity, pausedAt,
    questionsAnswered, questionsSkipped, currentQuestion
  }
}
```

### 2. Resume Quiz
```typescript
GET /api/tests/:id/resume
Query: ?sessionToken=xyz (optional for security)
Response: {
  canResume: boolean,
  reason?: string,
  test: {
    id, status, lastQuestion, questionsAnswered,
    resumeAttempt: 1,
    sessionToken: "new-token",
    resumeDeadline: "2025-12-24T10:30:00Z",
    timeRemaining: 85
  },
  questions: [ { id, alreadyAnswered, userAnswer } ]
}
```

### 3. Auto-Recovery on Load
```typescript
GET /api/tests/:id/status
Query: ?sessionToken=xyz
Response: {
  status: "ACTIVE" | "PAUSED" | "ABANDONED" | "COMPLETED",
  activeSession?: { canResume, lastQuestion, ... },
  action: "RESUME" | "RESTART" | "REVIEW"
}
```

### 4. Complete Incomplete Quiz
```typescript
POST /api/tests/:id/complete
Request: {
  incomplete: boolean,
  incompleteSince: number,  // question index
  reason: "USER_QUIT" | "TIMEOUT" | "NETWORK_ERROR"
}
Response: {
  testResult: {
    finalScore, totalPoints,
    completionStatus: "FULLY_COMPLETED" | "PARTIALLY_COMPLETED",
    questionsAnswered, questionsUnanswered,
    unansweredHandling: "MARKED_INCORRECT" | "MARKED_SKIPPED",
    performanceNote: "Quiz abandoned at Q15/Q20"
  }
}
```

---

## Scoring Logic for Incomplete Quizzes

### Configuration Option A: Score Unanswered as Incorrect
```
If user abandons at Q10/Q20:
- Q1-Q10: Score normally
- Q11-Q20: Mark as INCORRECT (0 points)
- Final Score: (Correct answers from Q1-Q10) / 20
- Shows: "Quiz incomplete - 10 questions unanswered"
```

### Configuration Option B: Score Only Answered Questions
```
If user abandons at Q10/Q20:
- Q1-Q10: Score normally
- Q11-Q20: Marked UNANSWERED (not counted in score)
- Final Score: (Correct answers from Q1-Q10) / 10
- Shows: "Quiz incomplete - scored on 10/20 questions"
- Mastery: Based only on Q1-Q10 performance
```

### Configuration Option C: Penalty Applied
```
If user abandons at Q10/Q20:
- Q1-Q10: Score normally
- Q11-Q20: Marked as SKIPPED
- Points: Normal calculation but -20% penalty for incompleteness
- Final Score: (Points earned) × 0.8
- Shows: "Quiz incomplete - 20% score penalty applied"
```

### Recommendation: HYBRID (Configurable per Quiz)
```
Test.unansweredAs = "SKIPPED" | "INCORRECT" | "PENDING"
Test.applyIncompleteePenalty = true | false
Test.incompletePenalty = 0.8  // 20% deduction
Test.includeUnansweredInStats = true | false

Example Config:
{
  "unansweredAs": "SKIPPED",
  "applyIncompletePenalty": true,
  "incompletePenalty": 0.9,  // 10% deduction
  "includeUnansweredInStats": false,  // Don't affect mastery
  "resumeWindowMinutes": 15,
  "maxResumeAttempts": 3
}
```

---

## Session Timeout Policy

```prisma
model TestPolicy {
  id                    String @id @default(cuid())

  // Resumption Window
  resumeWindowMinutes   Int @default(15)    // How long can resume
  maxResumeAttempts     Int @default(3)     // How many times can resume
  inactivityTimeoutMin  Int @default(30)    // When to auto-pause

  // Incomplete Handling
  scoreUnansweredAs     String @default("SKIPPED")  // SKIPPED or INCORRECT
  applyIncompletePenalty Boolean @default(false)
  incompletePenalty      Float @default(0.9)  // 90% of normal score

  // Evaluation
  includeUnansweredInMastery Boolean @default(false)
  trackAbandonmentRate  Boolean @default(true)

  createdAt             DateTime @default(now())
}
```

---

## Client-Side Heartbeat System

```typescript
// Client sends heartbeat every 5 seconds
POST /api/tests/:id/heartbeat
Request: {
  currentQuestion: 8,
  timeElapsed: 245,
  sessionToken: "abc123"
}
Response: {
  success: true,
  sessionActive: true,
  timeRemaining: 1215,  // seconds
  shouldPause: false
}

// On heartbeat failure = show reconnect dialog
// On shouldPause = true = pause quiz and ask to resume
```

---

## Database Queries for Session Management

### Find Paused Quizzes
```sql
SELECT * FROM Test
WHERE userId = ? AND status = 'PAUSED'
AND pausedAt > NOW() - INTERVAL 15 minutes
ORDER BY lastActivityAt DESC
```

### Auto-Abandon Timeout Quizzes
```sql
UPDATE Test SET status = 'ABANDONED', abandonReason = 'TIMEOUT'
WHERE status = 'PAUSED'
AND lastActivityAt < NOW() - INTERVAL 30 minutes
AND (
  SELECT COUNT(*) FROM TestSession
  WHERE testId = Test.id
) > 0
```

### Calculate Incomplete Quiz Stats
```sql
SELECT
  COUNT(*) as totalIncomplete,
  AVG(answeredCount) as avgQuestionsAnswered,
  SUM(CASE WHEN status = 'ABANDONED' THEN 1 ELSE 0 END) as abandonedCount,
  SUM(CASE WHEN status = 'TIMEOUT' THEN 1 ELSE 0 END) as timedOutCount
FROM Test
WHERE userId = ? AND status IN ('ABANDONED', 'TIMEOUT')
```

---

## Unanswered Question Evaluation Options

### Option 1: Skip (No Impact)
```
- Not counted in score
- Not counted in accuracy calculation
- Not counted in mastery
- Shows in quiz history as "Incomplete"
```

### Option 2: Incorrect (Full Penalty)
```
- Counted as wrong answer
- Impacts accuracy (0% on those questions)
- Impacts mastery calculation
- Shows in quiz history with low score
```

### Option 3: Partial (Configurable)
```
- Counted but with reduced penalty (e.g., -0.25 points instead of wrong)
- Impacts accuracy partially
- Weighted differently in mastery
- Shows as "Incomplete submission"
```

### Recommendation: Option 1 (Skip) + Optional Penalty
```
Default behavior:
- Unanswered questions = SKIPPED (don't count)
- Score calculated on answered questions only
- Mastery = based on answered questions
- User sees: "Quiz incomplete - 10/20 answered"

With incomplete penalty enabled:
- Same as above, but apply -10% penalty to final score
- Shows: "Quiz score reduced 10% due to incompleteness"
- Mastery: Still based only on answered questions
```

---

## Migration Path (Prisma)

```prisma
// Step 1: Add new fields to existing Test model
model Test {
  // ... existing fields ...

  // NEW FIELDS FOR SESSION MANAGEMENT
  status          String    @default("ACTIVE")
  sessionToken    String?   @unique
  lastActivityAt  DateTime  @default(now())
  pausedAt        DateTime?
  attemptNumber   Int       @default(1)
  maxAttempts     Int       @default(3)
  abandonReason   String?
  scoreIncomplete Boolean   @default(true)
  unansweredAs    String    @default("SKIPPED")
  answeredCount   Int       @default(0)
  skippedCount    Int       @default(0)
}

// Step 2: Add new Answer status
// Existing: ANSWERED, SKIPPED
// New: UNANSWERED, TIMEOUT, INCOMPLETE

// Step 3: Create StatusEvent table for tracking
// Step 4: Create TestPolicy table for configuration
```

---

## Summary of Recommendations

### 1. **Database Schema**
- ✅ Add `status` field to Test (ACTIVE, PAUSED, RESUMED, COMPLETED, ABANDONED, TIMEOUT)
- ✅ Add `sessionToken` for secure resumption
- ✅ Add `lastActivityAt` for timeout detection
- ✅ Add `StatusEvent` table for audit trail
- ✅ Update Answer model with UNANSWERED status
- ✅ Add TestPolicy for configuration

### 2. **Session Recovery**
- ✅ Support resume within 15 minutes
- ✅ Max 3 resume attempts
- ✅ Auto-timeout after 30 minutes inactivity
- ✅ Client heartbeat every 5 seconds
- ✅ Secure session tokens

### 3. **Incomplete Quiz Handling**
- ✅ Unanswered questions = SKIPPED by default
- ✅ Optional incomplete penalty (-10%)
- ✅ Score based on answered questions
- ✅ Mastery based only on answered questions
- ✅ Flag in history as INCOMPLETE

### 4. **Evaluation Policy**
- ✅ Abandoned quizzes still tracked
- ✅ Shown in test history (marked incomplete)
- ✅ Optional admin control over penalty
- ✅ Separate tracking for different abandonment reasons
- ✅ User notification for incomplete quizzes

### 5. **User Experience**
- ✅ Auto-detect disconnection
- ✅ Show "Resume" button on dashboard
- ✅ Allow resuming from where left off
- ✅ Clear messaging about incomplete status
- ✅ Option to restart if prefer fresh attempt

---

## Implementation Priority

### Phase 1 (Critical)
- [ ] Add fields to Test model
- [ ] Create StatusEvent table
- [ ] Implement pause/resume endpoints
- [ ] Add heartbeat system
- [ ] Handle incomplete quiz completion

### Phase 2 (Important)
- [ ] Create TestPolicy configuration
- [ ] Implement auto-timeout
- [ ] Add session recovery security
- [ ] Update leaderboard to handle incomplete
- [ ] Add incomplete quiz analytics

### Phase 3 (Nice-to-have)
- [ ] WebSocket for real-time sync
- [ ] Advanced recovery analytics
- [ ] ML-based disconnection prediction
- [ ] Offline quiz support
