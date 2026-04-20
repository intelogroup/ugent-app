# Implementation Plan: Student Test-Taking Experience

## Overview
Build a complete test-taking flow for students, from test creation to results review. Questions will be pulled from Supabase via existing API routes.

## Existing Backend (Already Built)
✅ **All API endpoints ready:**
- POST `/api/tests/create` - Create test
- GET `/api/tests/[id]` - Load test data
- POST `/api/tests/submit-answer` - Submit answer
- POST `/api/tests/[id]/pause` - Pause test
- GET `/api/tests/[id]/resume` - Resume test
- POST `/api/tests/[id]/complete` - Complete test
- GET `/api/tests/[id]/results` - Get results
- POST `/api/tests/[id]/heartbeat` - Keep session alive

✅ **Database models ready** (Prisma schema)
✅ **Design system defined** in `app/globals.css`

## User Journey Flow

```
1. /create-test → Configure test settings
2. Submit form → POST /api/tests/create
3. Redirect → /quiz/[testId]
4. Take quiz → Answer questions, auto-save
5. Complete → /quiz/[testId]/results
6. Review → See score, explanations, insights
```

## Implementation Phases

### Phase 1: Core Infrastructure (2 days)
**Create:**
- `/types/quiz.ts` - TypeScript interfaces for Test, Question, Answer, etc.
- `/lib/hooks/useQuiz.ts` - Main quiz state management hook
- `/lib/hooks/useTimer.ts` - Timer logic for timed exams
- `/lib/hooks/useHeartbeat.ts` - Session keep-alive (30s intervals)
- `/lib/hooks/useQuizNavigation.ts` - Navigation between questions

**Modify:**
- `/app/create-test/page.tsx` - Add API integration to POST `/api/tests/create` and redirect to `/quiz/[testId]`

### Phase 2: Quiz Components (2 days)
**Create:**
- `/components/quiz/QuizHeader.tsx` - Progress bar, timer, stats display
- `/components/quiz/QuestionCard.tsx` ⭐ - Question text and answer options
- `/components/quiz/AnswerOption.tsx` - Individual multiple choice option
- `/components/quiz/QuestionNavigation.tsx` - Previous/Next buttons
- `/components/quiz/QuestionMap.tsx` - Sidebar grid showing all questions with status
- `/components/quiz/TimerDisplay.tsx` - Countdown timer for timed exams
- `/components/quiz/FeedbackPanel.tsx` - Tutor mode immediate feedback

### Phase 3: Quiz Page Integration (2 days)
**Create:**
- `/app/quiz/[testId]/page.tsx` ⭐ - Main quiz interface

**Features:**
- Load test + questions on mount via GET `/api/tests/[id]`
- Display current question (1 at a time)
- Show progress: "Question X of Y"
- Answer selection with visual feedback
- Submit answer → POST `/api/tests/submit-answer` → auto-save → next question
- Question map sidebar (grid showing answered/unanswered/flagged status)
- Previous/Next navigation buttons
- Mark for review checkbox
- Auto-save on every answer submission

**Two Modes:**
- **Tutor Mode:** Immediate feedback, show explanation, must submit before proceeding, show points earned
- **Exam Mode:** No feedback until end, countdown timer, can skip questions, submit all at end

### Phase 4: Session Management (1 day)
**Create:**
- `/components/quiz/PauseModal.tsx` - Pause confirmation dialog
- `/components/quiz/ResumeModal.tsx` - Resume test dialog
- `/components/quiz/InactivityWarning.tsx` - Warning before auto-pause
- `/lib/hooks/useInactivityDetection.ts` - Auto-pause after 30 min inactivity

**Features:**
- Heartbeat every 30 seconds to keep session alive
- Auto-pause after 30 minutes of inactivity
- Pause/Resume functionality with 15-minute deadline
- Session token validation
- Handle session expiry gracefully

### Phase 5: Results Page (2 days)
**Create:**
- `/app/quiz/[testId]/results/page.tsx` ⭐ - Results page
- `/components/results/ScoreCard.tsx` - Overall score display
- `/components/results/DifficultyBreakdown.tsx` - Performance by difficulty level
- `/components/results/QuestionReview.tsx` - Review all questions with answers
- `/components/results/PerformanceInsights.tsx` - AI-generated insights
- `/components/results/ActionButtons.tsx` - Next action options

**Features:**
- Overall score card (percentage + total points)
- Points earned vs max possible
- Time spent on test
- Accuracy percentage
- Correct/Incorrect/Skipped counts
- Performance breakdown by difficulty (Easy/Medium/Hard)
- Full question review section:
  - Scrollable list of all questions
  - Show user's answer vs correct answer
  - Display explanations
  - Time spent per question
  - Points breakdown (base + bonuses)
- Performance insights (AI-generated)
- Action buttons: Review Test, Create New Test, Return to Dashboard

### Phase 6: Polish & Edge Cases (1 day)
- Error handling (network failures, session expiry, invalid test ID)
- Loading states + skeleton screens
- Browser refresh handling (restore state from API)
- Responsive design (mobile/tablet/desktop)
- Keyboard navigation + accessibility (WCAG AA)
- Touch-friendly interface for mobile

## Key Features by Test Mode

### Tutor Mode
- ✅ Immediate feedback after each answer
- ✅ Show correct/incorrect indicator
- ✅ Display explanation immediately
- ✅ Show points earned with bonuses
- ✅ Cannot skip questions (must submit before proceeding)
- ✅ AI insights and learning tips

### Exam Mode (Timed)
- ✅ No feedback until test completion
- ✅ Countdown timer with color warnings (red at <5 min)
- ✅ Can skip questions and return later
- ✅ Can change answers before final submission
- ✅ Submit all answers at end
- ✅ Auto-submit when timer reaches 0:00

## State Management Strategy

**Approach:** React Context + Custom Hooks (no external library needed)

```typescript
interface QuizState {
  // Test data
  test: Test | null;
  questions: Question[];
  currentQuestionIndex: number;

  // User progress
  answers: Map<string, Answer>;
  flaggedQuestions: Set<string>;

  // Session
  sessionToken: string;
  timeElapsed: number;
  timeRemaining: number | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  isPaused: boolean;
}
```

**Data Flow:**
```
User Action → Hook → API Call → Update State → Re-render UI
     ↓
Heartbeat (every 30s) → Keep session alive
     ↓
Auto-save answers → Background persistence
```

## Edge Cases to Handle

1. **Network errors** - Retry logic, queue failed requests, show offline indicator
2. **Session expiry** - Auto-pause test, show resume modal on return
3. **Browser refresh** - Restore state from API (use API as source of truth)
4. **Timer expiry** - Auto-submit test when countdown reaches 0:00
5. **Invalid test ID** - Show error message, redirect to /create-test
6. **Resume deadline passed** - Show "Resume deadline expired", offer new test
7. **Inactivity timeout** - Warning at 25 min, auto-pause at 30 min
8. **Test already completed** - Redirect to results page

## Design Consistency

**Following existing design patterns from codebase:**
- **Primary blue:** `#3B82F6` (from `app/globals.css`)
- **Cards:** `rounded-2xl border border-neutral-200 p-6 shadow-sm bg-white`
- **Buttons:** `.btn-primary` / `.btn-secondary` classes
- **Spacing:** `space-y-6` for sections, `space-y-4` for cards
- **Icons:** Heroicons (already used throughout app)
- **Typography:** H1/H2/H3 styles from `globals.css`
- **Progress bars:** `h-2 bg-neutral-200 rounded-full` with gradient fill

## Critical Files (Implementation Priority)

### Top Priority
1. **`/app/quiz/[testId]/page.tsx`** - Core quiz interface, orchestrates all quiz functionality
2. **`/lib/hooks/useQuiz.ts`** - Central state management hook
3. **`/components/quiz/QuestionCard.tsx`** - Main question display component

### High Priority
4. **`/app/quiz/[testId]/results/page.tsx`** - Results page with comprehensive breakdown
5. **`/components/quiz/QuizHeader.tsx`** - Progress tracking and timer display
6. **`/components/quiz/QuestionNavigation.tsx`** - Navigation controls
7. **`/components/quiz/QuestionMap.tsx`** - Question status grid sidebar

### Medium Priority
8. **`/components/quiz/PauseModal.tsx`** - Pause functionality
9. **`/components/quiz/ResumeModal.tsx`** - Resume functionality
10. **`/lib/hooks/useTimer.ts`** - Timer logic
11. **`/lib/hooks/useHeartbeat.ts`** - Session keep-alive

### Modified Files
- **`/app/create-test/page.tsx`** - Add API integration and redirect logic

## Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Core Infrastructure | 2 days | Hooks, types, test creation integration |
| Phase 2: Quiz Components | 2 days | All quiz UI components |
| Phase 3: Quiz Page | 2 days | Working quiz interface with both modes |
| Phase 4: Session Management | 1 day | Pause/resume, heartbeat, inactivity |
| Phase 5: Results Page | 2 days | Complete results page with review |
| Phase 6: Polish & Testing | 1 day | Edge cases, responsive, accessibility |

**Total Estimated Time:** 10 days

## Success Criteria

✅ User can create a test and immediately start taking it
✅ Questions display one at a time with multiple choice options
✅ Answers auto-save on submission
✅ Timer counts down for timed exams with color warnings
✅ Users can pause and resume within 15-minute window
✅ System auto-pauses after 30 minutes of inactivity
✅ Results page shows comprehensive score breakdown
✅ All questions are reviewable with explanations
✅ Fully responsive on mobile, tablet, and desktop
✅ Keyboard navigation works throughout
✅ Proper error handling for network issues
✅ Session recovery works after browser refresh

## API Integration Points

| User Action | API Endpoint | Method | Data Sent | Response |
|-------------|--------------|--------|-----------|----------|
| Create test | `/api/tests/create` | POST | subjects, topics, settings | testId |
| Load quiz | `/api/tests/[id]` | GET | - | test, questions, progress |
| Submit answer | `/api/tests/submit-answer` | POST | answer, timeSpent | points, isCorrect |
| Heartbeat | `/api/tests/[id]/heartbeat` | POST | sessionToken, progress | timeRemaining |
| Pause test | `/api/tests/[id]/pause` | POST | currentState | success |
| Resume test | `/api/tests/[id]/resume` | GET | action=RESUME | test state |
| Complete test | `/api/tests/[id]/complete` | POST | finalState | success |
| Get results | `/api/tests/[id]/results` | GET | - | complete results |

## Next Steps

1. Review this plan
2. Confirm approach and priorities
3. Begin Phase 1 implementation
4. Iterate based on feedback

---

**Note:** This plan leverages all existing backend infrastructure. No database or API changes needed - purely frontend implementation.
