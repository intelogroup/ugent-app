# Quiz Session Recovery Endpoints Implementation Guide

## New Endpoints Required

### 1. Heartbeat Endpoint (Client → Server)
```typescript
POST /api/tests/:id/heartbeat

Purpose: Keep session alive and detect disconnections

Request:
{
  sessionToken: "abc123...",
  currentQuestion: 8,        // 0-indexed
  timeElapsed: 245,          // seconds
  answered: 7,
  skipped: 1,
  status: "ANSWERING" | "PAUSED"
}

Response (200):
{
  success: true,
  sessionActive: true,
  timeRemaining: 1215,       // seconds
  shouldPause: false,        // Should client pause?
  maxInactivity: 30          // minutes before auto-pause
}

Response (410) - Session Expired:
{
  error: "session_expired",
  reason: "inactivity_timeout",
  message: "Your session has expired. Please start a new quiz."
}

Response (400) - Invalid Token:
{
  error: "invalid_session",
  reason: "invalid_token",
  message: "Session token is invalid or expired."
}
```

### 2. Pause Quiz Endpoint
```typescript
POST /api/tests/:id/pause

Purpose: Gracefully pause a quiz (user action)

Request:
{
  reason: "USER_QUIT" | "NETWORK_ERROR" | "AUTO_TIMEOUT",
  currentQuestion: 8,
  questionsAnswered: 7,
  questionsSkipped: 1
}

Response (200):
{
  success: true,
  test: {
    id: "test123",
    status: "PAUSED",
    lastActivityAt: "2025-12-24T10:30:00Z",
    pausedAt: "2025-12-24T10:31:45Z",
    questionsAnswered: 7,
    questionsSkipped: 1,
    currentQuestion: 8,
    resumeWindow: 15,          // minutes
    resumeDeadline: "2025-12-24T10:46:45Z"
  }
}
```

### 3. Resume Quiz Endpoint
```typescript
GET /api/tests/:id/resume

Purpose: Check if quiz can be resumed and get current state

Query Parameters:
?sessionToken=abc123...     (optional, for security)
?action=CHECK | RESUME      (default: CHECK)

Response (200) - Can Resume:
{
  canResume: true,
  reason: "quiz_paused",
  test: {
    id: "test123",
    status: "PAUSED",
    lastActivityAt: "2025-12-24T10:30:00Z",
    questionsAnswered: 7,
    questionsSkipped: 1,
    currentQuestion: 8,         // 0-indexed, resume from Q9
    resumeAttempt: 1,
    maxResumeAttempts: 3,
    sessionToken: "new-token-xyz...",
    resumeDeadline: "2025-12-24T10:46:45Z",
    timeRemaining: 857             // seconds remaining
  },
  // Current state of answered questions
  questions: [
    {
      index: 0,
      id: "q1",
      userAnswer: "opt1",
      status: "ANSWERED"
    },
    {
      index: 7,
      id: "q8",
      userAnswer: null,
      status: "UNANSWERED"      // Where to resume
    }
  ]
}

Response (400) - Cannot Resume:
{
  canResume: false,
  reason: "resume_deadline_expired" | "max_attempts_exceeded" | "test_completed",
  message: "This quiz can no longer be resumed. You can start a new quiz instead.",
  recommendedAction: "RESTART" | "REVIEW"
}

Response (404) - Test Not Found:
{
  error: "test_not_found",
  message: "Quiz not found or has been deleted."
}
```

### 4. Get Quiz Status Endpoint
```typescript
GET /api/tests/:id/status

Purpose: Check current status without resuming

Response (200):
{
  id: "test123",
  userId: "user123",
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ABANDONED" | "TIMEOUT",

  activeSession: {
    canResume: true,
    lastActivityAt: "2025-12-24T10:30:00Z",
    pausedAt: "2025-12-24T10:31:45Z",
    resumeAttempt: 1,
    maxResumeAttempts: 3,
    resumeDeadline: "2025-12-24T10:46:45Z",
    lastQuestion: 8,
    questionsAnswered: 7,
    questionsSkipped: 1
  } | null,

  completedSession: {
    finalScore: 78.5,
    totalPoints: 1245,
    completionStatus: "FULLY_COMPLETED" | "PARTIALLY_COMPLETED",
    completedAt: "2025-12-24T10:45:00Z"
  } | null,

  recommendedAction: "RESUME" | "RESTART" | "REVIEW" | "NONE"
}
```

### 5. Auto-Complete Incomplete Quiz
```typescript
POST /api/tests/:id/auto-complete

Purpose: Auto-complete quiz after timeout or abandonment

Request:
{
  reason: "TIMEOUT" | "INACTIVITY" | "USER_QUIT",
  lastAnsweredQuestion: 10,
  totalQuestions: 20
}

Response (200):
{
  success: true,
  testResult: {
    testId: "test123",
    status: "COMPLETED",
    completionStatus: "PARTIALLY_COMPLETED",

    finalScore: 62.5,
    totalPoints: 987,

    answered: 10,
    skipped: 3,
    unanswered: 7,

    accuracy: 75.0,           // Based on answered only

    // How unanswered were handled
    unansweredHandling: {
      handling: "SKIPPED" | "INCORRECT",
      applied: true,
      description: "7 unanswered questions were not counted in score",
      note: "Quiz incomplete - scored on 13/20 questions"
    },

    // Incomplete penalty
    penalty: {
      applied: false | true,
      percentage: 0 | 10,
      description: "No penalty applied"
    },

    completedAt: "2025-12-24T10:31:45Z",
    incompletionReason: "TIMEOUT",

    // Stats
    stats: {
      questionsAnswered: 10,
      questionsSkipped: 3,
      questionsUnanswered: 7,
      answeredPercentage: 50,
      completionPercentage: 65
    }
  }
}
```

### 6. Get Recovery History
```typescript
GET /api/tests/:id/recovery-history

Purpose: View all pauses, resumes, and recovery attempts

Response (200):
{
  testId: "test123",
  totalAttempts: 2,
  sessions: [
    {
      sessionNumber: 1,
      startedAt: "2025-12-24T10:00:00Z",
      pausedAt: "2025-12-24T10:31:45Z",
      resumedAt: null,
      endedAt: null,
      disconnectCount: 1,
      lastQuestion: 8,
      questionsAnswered: 7,
      reason: "NETWORK_ERROR"
    },
    {
      sessionNumber: 2,
      startedAt: "2025-12-24T10:32:00Z",  // Resumed
      pausedAt: null,
      resumedAt: "2025-12-24T10:32:00Z",
      endedAt: "2025-12-24T10:45:00Z",
      completionStatus: "PARTIALLY_COMPLETED",
      lastQuestion: 20,
      questionsAnswered: 13,
      questionsUnanswered: 7
    }
  ],

  events: [
    {
      timestamp: "2025-12-24T10:00:00Z",
      type: "STARTED",
      question: 1
    },
    {
      timestamp: "2025-12-24T10:31:45Z",
      type: "PAUSED",
      question: 8,
      reason: "NETWORK_ERROR"
    },
    {
      timestamp: "2025-12-24T10:32:00Z",
      type: "RESUMED",
      question: 8,
      attemptNumber: 2
    },
    {
      timestamp: "2025-12-24T10:45:00Z",
      type: "COMPLETED",
      completionStatus: "PARTIALLY_COMPLETED"
    }
  ]
}
```

---

## Implementation Examples

### Backend: Heartbeat Endpoint
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { sessionToken, currentQuestion, timeElapsed } = body;

    if (!userId || !testId || !sessionToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify test exists and belongs to user
    const test = await prisma.test.findUnique({
      where: { id: testId },
    });

    if (!test || test.userId !== userId) {
      return NextResponse.json(
        { error: 'test_not_found' },
        { status: 404 }
      );
    }

    // Verify session token
    if (test.sessionToken !== sessionToken) {
      return NextResponse.json(
        {
          error: 'invalid_session',
          reason: 'invalid_token',
        },
        { status: 400 }
      );
    }

    // Check if session is still valid
    const inactivityMinutes = (Date.now() - test.lastActivityAt.getTime()) / 1000 / 60;
    if (inactivityMinutes > 30) {
      // Auto-pause due to inactivity
      await prisma.test.update({
        where: { id: testId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
          abandonReason: 'AUTO_TIMEOUT',
        },
      });

      return NextResponse.json(
        {
          sessionActive: false,
          error: 'session_expired',
          reason: 'inactivity_timeout',
        },
        { status: 410 }
      );
    }

    // Update lastActivityAt to keep session alive
    await prisma.test.update({
      where: { id: testId },
      data: {
        lastActivityAt: new Date(),
      },
    });

    // Calculate time remaining
    const timeRemaining = test.timeLimit
      ? test.timeLimit * 60 - timeElapsed
      : null;

    return NextResponse.json(
      {
        success: true,
        sessionActive: true,
        timeRemaining,
        shouldPause: false,
        maxInactivity: 30,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'heartbeat_failed' },
      { status: 500 }
    );
  }
}
```

### Frontend: Heartbeat System
```typescript
import { useEffect } from 'react';

export function useQuizHeartbeat(testId: string, sessionToken: string) {
  useEffect(() => {
    const heartbeatInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tests/${testId}/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionToken,
            currentQuestion: getCurrentQuestion(),
            timeElapsed: getTimeElapsed(),
          }),
        });

        if (response.status === 410) {
          // Session expired
          clearInterval(heartbeatInterval);
          showSessionExpiredDialog();
        }

        if (!response.ok) {
          console.error('Heartbeat failed');
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
        // Show reconnection dialog
      }
    }, 5000); // Every 5 seconds

    return () => clearInterval(heartbeatInterval);
  }, [testId, sessionToken]);
}

// Show resume dialog when user returns
export function useAutoResume(testId: string) {
  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch(`/api/tests/${testId}/status`);
      const data = await response.json();

      if (data.status === 'PAUSED' && data.activeSession?.canResume) {
        showResumeDialog({
          lastQuestion: data.activeSession.lastQuestion,
          onResume: async () => {
            const resumeResponse = await fetch(
              `/api/tests/${testId}/resume?action=RESUME`
            );
            const resumeData = await resumeResponse.json();
            // Load quiz from last question
          },
          onRestart: () => {
            // Start fresh quiz
          },
        });
      }
    };

    checkSession();
  }, [testId]);
}
```

---

## State Transitions

```
ACTIVE (normal quiz taking)
  ↓
  ├─→ COMPLETED (all questions answered)
  ├─→ PAUSED (user paused or disconnected)
  │     ↓
  │     ├─→ RESUMED (user resumed)
  │     │     ↓
  │     │     └─→ COMPLETED or PAUSED again
  │     │
  │     └─→ TIMEOUT (30 mins inactivity)
  │           ↓
  │           └─→ ABANDONED (deadline passed)
  │
  └─→ ABANDONED (user quit)
```

---

## Client-Side Detection Strategies

### Strategy 1: Heartbeat Failure
```typescript
let heartbeatFailures = 0;
const maxFailures = 3;

heartbeat.onerror = () => {
  heartbeatFailures++;
  if (heartbeatFailures >= maxFailures) {
    showReconnectDialog();
  }
};
```

### Strategy 2: Browser Events
```typescript
window.addEventListener('beforeunload', async (e) => {
  // User closing tab - pause quiz
  await pauseQuiz();
  e.preventDefault();
});

window.addEventListener('offline', () => {
  // No internet - show offline message
  pauseQuiz('NETWORK_ERROR');
});
```

### Strategy 3: Focus Loss Detection
```typescript
window.addEventListener('blur', () => {
  // User switched tabs - optionally pause
  lastActiveTime = Date.now();
});

setInterval(() => {
  if (Date.now() - lastActiveTime > 5 * 60 * 1000) {
    // Inactive for 5 mins, show warning
    showInactivityWarning();
  }
}, 30 * 1000);
```

---

## Data Considerations

### Question 1: Unanswered vs Skipped
```
SKIPPED: User explicitly clicked "Skip"
  - Intent: I'm deliberately not answering this
  - Impact: Should not count in score

UNANSWERED: Quiz ended before user answered
  - Intent: User didn't have chance to answer
  - Impact: Policy-dependent (skip or incorrect)
```

### Question 2: Evaluation Policy
```
Option A: "Continue with unanswered as skipped"
- Score based on answered questions only
- Mastery based on answered questions only
- No penalty
- User sees: "Quiz incomplete - 10/20 answered, scored 8/10"

Option B: "Mark unanswered as incorrect"
- Score based on all questions (0 for unanswered)
- Mastery reflects all questions
- Automatic penalty
- User sees: "Quiz incomplete - 8/20 correct"

Recommendation: Option A (more fair)
```

---

## Summary

This session recovery system provides:
1. ✅ Graceful handling of disconnections
2. ✅ Ability to resume from exact point
3. ✅ Fair evaluation of incomplete quizzes
4. ✅ Complete audit trail of all attempts
5. ✅ Configurable policies
6. ✅ User-friendly experience

Implementation order:
1. Heartbeat endpoint
2. Pause endpoint
3. Resume endpoint
4. Status endpoint
5. Auto-complete endpoint
6. Recovery history endpoint
