-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "TestMode" AS ENUM ('TUTOR', 'TIMED');

-- CreateEnum
CREATE TYPE "QuestionMode" AS ENUM ('STANDARD', 'CUSTOM', 'PRACTICE');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AnswerStatus" AS ENUM ('CORRECT', 'INCORRECT', 'PARTIAL', 'SKIPPED', 'NOT_ANSWERED', 'UNANSWERED', 'TIMEOUT', 'INCOMPLETE', 'MARKED_REVIEW');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('ACTIVE', 'PAUSED', 'RESUMED', 'COMPLETED', 'ABANDONED', 'TIMEOUT', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "AbandonReason" AS ENUM ('USER_QUIT', 'NETWORK_ERROR', 'BROWSER_CRASH', 'AUTO_TIMEOUT', 'SYSTEM_ERROR');

-- CreateEnum
CREATE TYPE "UnansweredHandling" AS ENUM ('SKIPPED', 'INCORRECT', 'PENDING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "avatar" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "icon" TEXT,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "systemId" TEXT,
    "topicId" TEXT,
    "subjectId" TEXT,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTimeSpent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mode" "TestMode" NOT NULL DEFAULT 'TUTOR',
    "questionMode" "QuestionMode" NOT NULL DEFAULT 'STANDARD',
    "useAI" BOOLEAN NOT NULL DEFAULT false,
    "totalQuestions" INTEGER NOT NULL,
    "timeLimit" INTEGER,
    "selectedSubjects" TEXT[],
    "selectedTopics" TEXT[],
    "score" DOUBLE PRECISION,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalIncorrect" INTEGER NOT NULL DEFAULT 0,
    "totalSkipped" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "status" "TestStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionToken" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "completionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "abandonReason" "AbandonReason",
    "scoreIncompleteAs" "UnansweredHandling" NOT NULL DEFAULT 'SKIPPED',
    "applyIncompletePenalty" BOOLEAN NOT NULL DEFAULT false,
    "incompletePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "answeredCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "unansweredCount" INTEGER NOT NULL DEFAULT 0,
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "status" "AnswerStatus" NOT NULL DEFAULT 'NOT_ANSWERED',
    "isCorrect" BOOLEAN,
    "timeSpent" INTEGER,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "markedForReview" BOOLEAN NOT NULL DEFAULT false,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "lastModified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "testId" TEXT,
    "questionId" TEXT,
    "answerId" TEXT,
    "metadata" TEXT,
    "durationMs" INTEGER,
    "clientIP" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "systemId" TEXT,
    "topicId" TEXT,
    "subjectId" TEXT,
    "masteryLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuestionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "questionId" TEXT,
    "systemId" TEXT,
    "topicId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "sessionToken" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "deviceType" TEXT,
    "browser" TEXT,
    "totalEventCount" INTEGER NOT NULL DEFAULT 0,
    "focusLostCount" INTEGER NOT NULL DEFAULT 0,
    "focusRestoredCount" INTEGER NOT NULL DEFAULT 0,
    "disconnectCount" INTEGER NOT NULL DEFAULT 0,
    "canResume" BOOLEAN NOT NULL DEFAULT true,
    "resumeDeadline" TIMESTAMP(3),
    "resumeAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxResumeAttempts" INTEGER NOT NULL DEFAULT 3,
    "averageResponseTime" INTEGER,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswersCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" INTEGER,
    "notes" TEXT,

    CONSTRAINT "ReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "focusAreas" TEXT[],
    "targetMasteryLevel" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLeaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuestionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "totalCorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "overallSuccessRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedReadiness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timePerQuestion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuestionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "totalCorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "testsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalStudyTime" INTEGER NOT NULL DEFAULT 0,
    "activeDaysCount" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "dailyGoalMetDays" INTEGER NOT NULL DEFAULT 0,
    "optimalStudyTime" TEXT,
    "bestDayOfWeek" TEXT,
    "globalRank" INTEGER,
    "percentileRank" DOUBLE PRECISION,
    "friendsRank" INTEGER,
    "monthlyGrowthRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyGrowthRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectedExamDate" TIMESTAMP(3),
    "projectedReadiness" DOUBLE PRECISION,
    "subjectMastery" JSONB,
    "topicPerformance" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "peakPerformanceTime" TEXT,
    "bestStudyDay" TEXT,
    "avgSessionDuration" INTEGER,
    "hardQAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "easyQAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferredDifficulty" TEXT,
    "errorPatterns" JSONB,
    "commonMistakes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionScore" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "timeBonus" DOUBLE PRECISION NOT NULL,
    "streakMultiplier" DOUBLE PRECISION NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "isFromIncomplete" BOOLEAN NOT NULL DEFAULT false,
    "pointAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "adjustmentReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusEvent" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "StatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPolicy" (
    "id" TEXT NOT NULL,
    "resumeWindowMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxResumeAttempts" INTEGER NOT NULL DEFAULT 3,
    "inactivityTimeoutMin" INTEGER NOT NULL DEFAULT 30,
    "scoreUnansweredAs" "UnansweredHandling" NOT NULL DEFAULT 'SKIPPED',
    "applyIncompletePenalty" BOOLEAN NOT NULL DEFAULT false,
    "incompletePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "includeUnansweredInMastery" BOOLEAN NOT NULL DEFAULT false,
    "trackAbandonmentRate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "System_name_key" ON "System"("name");

-- CreateIndex
CREATE INDEX "System_displayOrder_idx" ON "System"("displayOrder");

-- CreateIndex
CREATE INDEX "Topic_systemId_idx" ON "Topic"("systemId");

-- CreateIndex
CREATE INDEX "Topic_displayOrder_idx" ON "Topic"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_systemId_name_key" ON "Topic"("systemId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "Subject_displayOrder_idx" ON "Subject"("displayOrder");

-- CreateIndex
CREATE INDEX "Question_systemId_idx" ON "Question"("systemId");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_idx" ON "AnswerOption"("questionId");

-- CreateIndex
CREATE INDEX "AnswerOption_isCorrect_idx" ON "AnswerOption"("isCorrect");

-- CreateIndex
CREATE UNIQUE INDEX "Test_sessionToken_key" ON "Test"("sessionToken");

-- CreateIndex
CREATE INDEX "Test_userId_idx" ON "Test"("userId");

-- CreateIndex
CREATE INDEX "Test_status_idx" ON "Test"("status");

-- CreateIndex
CREATE INDEX "Test_lastActivityAt_idx" ON "Test"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Test_sessionToken_idx" ON "Test"("sessionToken");

-- CreateIndex
CREATE INDEX "Test_createdAt_idx" ON "Test"("createdAt");

-- CreateIndex
CREATE INDEX "Test_completedAt_idx" ON "Test"("completedAt");

-- CreateIndex
CREATE INDEX "TestQuestion_testId_idx" ON "TestQuestion"("testId");

-- CreateIndex
CREATE INDEX "TestQuestion_questionId_idx" ON "TestQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TestQuestion_testId_questionId_key" ON "TestQuestion"("testId", "questionId");

-- CreateIndex
CREATE INDEX "Answer_userId_idx" ON "Answer"("userId");

-- CreateIndex
CREATE INDEX "Answer_testId_idx" ON "Answer"("testId");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE INDEX "Answer_isCorrect_idx" ON "Answer"("isCorrect");

-- CreateIndex
CREATE INDEX "Answer_status_idx" ON "Answer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_testId_questionId_key" ON "Answer"("testId", "questionId");

-- CreateIndex
CREATE INDEX "UserInteraction_userId_idx" ON "UserInteraction"("userId");

-- CreateIndex
CREATE INDEX "UserInteraction_actionType_idx" ON "UserInteraction"("actionType");

-- CreateIndex
CREATE INDEX "UserInteraction_entityType_idx" ON "UserInteraction"("entityType");

-- CreateIndex
CREATE INDEX "UserInteraction_createdAt_idx" ON "UserInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "UserInteraction_testId_idx" ON "UserInteraction"("testId");

-- CreateIndex
CREATE INDEX "UserInteraction_questionId_idx" ON "UserInteraction"("questionId");

-- CreateIndex
CREATE INDEX "Progress_userId_idx" ON "Progress"("userId");

-- CreateIndex
CREATE INDEX "Progress_systemId_idx" ON "Progress"("systemId");

-- CreateIndex
CREATE INDEX "Progress_topicId_idx" ON "Progress"("topicId");

-- CreateIndex
CREATE INDEX "Progress_subjectId_idx" ON "Progress"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_systemId_topicId_subjectId_key" ON "Progress"("userId", "systemId", "topicId", "subjectId");

-- CreateIndex
CREATE INDEX "StudyNote_userId_idx" ON "StudyNote"("userId");

-- CreateIndex
CREATE INDEX "StudyNote_createdAt_idx" ON "StudyNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestSession_sessionToken_key" ON "TestSession"("sessionToken");

-- CreateIndex
CREATE INDEX "TestSession_userId_idx" ON "TestSession"("userId");

-- CreateIndex
CREATE INDEX "TestSession_testId_idx" ON "TestSession"("testId");

-- CreateIndex
CREATE INDEX "TestSession_sessionToken_idx" ON "TestSession"("sessionToken");

-- CreateIndex
CREATE INDEX "TestSession_startedAt_idx" ON "TestSession"("startedAt");

-- CreateIndex
CREATE INDEX "ReviewHistory_userId_idx" ON "ReviewHistory"("userId");

-- CreateIndex
CREATE INDEX "ReviewHistory_reviewedAt_idx" ON "ReviewHistory"("reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPath_userId_key" ON "LearningPath"("userId");

-- CreateIndex
CREATE INDEX "LearningPath_userId_idx" ON "LearningPath"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLeaderboard_userId_key" ON "UserLeaderboard"("userId");

-- CreateIndex
CREATE INDEX "UserLeaderboard_averageScore_idx" ON "UserLeaderboard"("averageScore");

-- CreateIndex
CREATE INDEX "UserLeaderboard_rank_idx" ON "UserLeaderboard"("rank");

-- CreateIndex
CREATE INDEX "AIInsight_userId_idx" ON "AIInsight"("userId");

-- CreateIndex
CREATE INDEX "AIInsight_createdAt_idx" ON "AIInsight"("createdAt");

-- CreateIndex
CREATE INDEX "AIInsight_type_idx" ON "AIInsight"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceSummary_userId_key" ON "PerformanceSummary"("userId");

-- CreateIndex
CREATE INDEX "PerformanceSummary_userId_idx" ON "PerformanceSummary"("userId");

-- CreateIndex
CREATE INDEX "PerformanceSummary_globalRank_idx" ON "PerformanceSummary"("globalRank");

-- CreateIndex
CREATE INDEX "PerformanceSummary_estimatedReadiness_idx" ON "PerformanceSummary"("estimatedReadiness");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPattern_userId_key" ON "LearningPattern"("userId");

-- CreateIndex
CREATE INDEX "LearningPattern_userId_idx" ON "LearningPattern"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionScore_answerId_key" ON "QuestionScore"("answerId");

-- CreateIndex
CREATE INDEX "QuestionScore_answerId_idx" ON "QuestionScore"("answerId");

-- CreateIndex
CREATE INDEX "StatusEvent_sessionId_idx" ON "StatusEvent"("sessionId");

-- CreateIndex
CREATE INDEX "StatusEvent_eventType_idx" ON "StatusEvent"("eventType");

-- CreateIndex
CREATE INDEX "StatusEvent_createdAt_idx" ON "StatusEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "AnswerOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceSummary" ADD CONSTRAINT "PerformanceSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPattern" ADD CONSTRAINT "LearningPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionScore" ADD CONSTRAINT "QuestionScore_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
