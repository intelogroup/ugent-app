# Ugent App - Complete API Documentation

## Overview
This document outlines all API endpoints organized by system. Currently implemented endpoints are marked with ✅.

---

## 🎯 Quiz/Test Engine Endpoints

### 1. Create Test
**✅ POST `/api/tests/create`**

Creates a new test/quiz session for the user.

**Request:**
```json
{
  "userId": "user123",
  "subjects": ["subject-id-1", "subject-id-2"],
  "topics": ["topic-id-1"],
  "systems": ["cardio", "neuro"],
  "questionCount": 20,
  "testMode": "TUTOR",          // "TUTOR" | "TIMED"
  "questionMode": "STANDARD",   // "STANDARD" | "CUSTOM" | "PRACTICE"
  "difficulty": "MIXED",        // "EASY" | "MEDIUM" | "HARD" | "MIXED"
  "timeLimit": 120,             // optional, in minutes
  "useAI": false                // AI-adaptive difficulty
}
```

**Response (201):**
```json
{
  "success": true,
  "test": {
    "id": "test123",
    "title": "Tutor Test - 12/23/2025",
    "totalQuestions": 20,
    "timeLimit": 120,
    "mode": "TUTOR",
    "startedAt": "2025-12-23T17:30:00Z",
    "questions": [
      {
        "id": "q1",
        "text": "Question text here...",
        "difficulty": "MEDIUM",
        "options": [
          {
            "id": "opt1",
            "text": "Option A",
            "displayOrder": 1
          }
        ]
      }
    ]
  }
}
```

---

### 2. Submit Answer
**✅ POST `/api/tests/submit-answer`**

Submits an answer to a question. Calculates points with multipliers.

**Request:**
```json
{
  "userId": "user123",
  "testId": "test123",
  "questionId": "q1",
  "selectedOptionId": "opt1",
  "timeSpent": 45                // in seconds
}
```

**Response (200):**
```json
{
  "success": true,
  "answer": {
    "id": "ans1",
    "status": "CORRECT",          // "CORRECT" | "INCORRECT" | "SKIPPED"
    "isCorrect": true,
    "timeSpent": 45
  },
  "points": 56,                   // calculated with multipliers
  "feedback": {
    "correct": true,
    "message": "Correct!"
  }
}
```

**Points Calculation:**
```
Points = BasePoints × TimeBonus × StreakMultiplier

BasePoints:
  - EASY: 10 points
  - MEDIUM: 20 points
  - HARD: 30 points

TimeBonus (only if correct):
  - <30% of time limit: 1.5x (50% bonus)
  - 30-70% of time limit: 1.25x (25% bonus)
  - >70% of time limit: 1.0x (no bonus)

StreakMultiplier (today's correct answers):
  - 0-3: 1.0x
  - 4-7: 1.2x
  - 8-15: 1.5x
  - 16+: 2.0x (capped)

Example:
Hard question (30 pts) + fast answer (1.5x) + 8-question streak (1.5x)
= 30 × 1.5 × 1.5 = 67.5 → 68 points
```

---

### 3. Get Test Details
**POST `/api/tests/:id`**

Retrieves test details and progress.

**Response:**
```json
{
  "test": {
    "id": "test123",
    "title": "Tutor Test",
    "totalQuestions": 20,
    "answered": 15,
    "skipped": 3,
    "remaining": 2,
    "score": 1245,
    "correctAnswers": 14,
    "incorrectAnswers": 1,
    "mode": "TUTOR",
    "startedAt": "2025-12-23T17:30:00Z"
  }
}
```

---

### 4. Complete Test
**POST `/api/tests/:id/complete`**

Marks test as completed and calculates final results.

**Response:**
```json
{
  "success": true,
  "testResult": {
    "testId": "test123",
    "finalScore": 78.5,
    "totalPoints": 1245,
    "correctAnswers": 14,
    "incorrectAnswers": 1,
    "skipped": 5,
    "accuracy": 87.5,
    "timeSpent": 1823,            // seconds
    "completedAt": "2025-12-23T18:45:00Z",
    "performance": {
      "easyAccuracy": 95,
      "mediumAccuracy": 87,
      "hardAccuracy": 72
    }
  }
}
```

---

### 5. Get Test Results
**GET `/api/tests/:id/results`**

Retrieves completed test results with detailed breakdowns.

**Response:**
```json
{
  "test": {
    "id": "test123",
    "title": "Tutor Test",
    "completedAt": "2025-12-23T18:45:00Z"
  },
  "summary": {
    "finalScore": 78.5,
    "totalPoints": 1245,
    "accuracy": 87.5,
    "timeSpent": 1823
  },
  "byDifficulty": {
    "EASY": { "accuracy": 95, "points": 285 },
    "MEDIUM": { "accuracy": 87, "points": 580 },
    "HARD": { "accuracy": 72, "points": 380 }
  },
  "bySystem": {
    "Cardiovascular": { "accuracy": 85, "points": 420 },
    "Neurology": { "accuracy": 78, "points": 380 }
  },
  "questions": [
    {
      "questionId": "q1",
      "questionText": "...",
      "difficulty": "MEDIUM",
      "correct": true,
      "pointsEarned": 45,
      "timeSpent": 35,
      "userAnswer": "Option A",
      "correctAnswer": "Option A"
    }
  ]
}
```

---

### 3. Get Test Details
**✅ GET `/api/tests/:id`**

Retrieves test details and progress information.

**Response:**
```json
{
  "test": {
    "id": "test123",
    "title": "Tutor Test",
    "totalQuestions": 20,
    "answered": 15,
    "correct": 14,
    "incorrect": 1,
    "skipped": 0,
    "remaining": 5,
    "currentScore": 1245,
    "mode": "TUTOR",
    "startedAt": "2025-12-23T17:30:00Z",
    "completedAt": null
  }
}
```

---

### 4. Complete Test
**✅ POST `/api/tests/:id/complete`**

Marks test as completed and calculates final results.

**Response:**
```json
{
  "success": true,
  "testResult": {
    "testId": "test123",
    "finalScore": 78.5,
    "totalPoints": 1245,
    "correctAnswers": 14,
    "incorrectAnswers": 1,
    "skipped": 5,
    "accuracy": 87.5,
    "timeSpent": 1823,
    "completedAt": "2025-12-23T18:45:00Z",
    "performance": {
      "byDifficulty": {
        "EASY": { "accuracy": 95, "points": 285 },
        "MEDIUM": { "accuracy": 87, "points": 580 },
        "HARD": { "accuracy": 72, "points": 380 }
      }
    }
  }
}
```

---

### 5. Get Test Results
**✅ GET `/api/tests/:id/results`**

Retrieves completed test results with detailed breakdowns.

**Response:**
```json
{
  "test": {
    "id": "test123",
    "title": "Tutor Test",
    "completedAt": "2025-12-23T18:45:00Z"
  },
  "summary": {
    "finalScore": 78.5,
    "totalPoints": 1245,
    "accuracy": 87.5,
    "timeSpent": 1823
  },
  "byDifficulty": {
    "EASY": { "accuracy": 95, "points": 285 },
    "MEDIUM": { "accuracy": 87, "points": 580 },
    "HARD": { "accuracy": 72, "points": 380 }
  },
  "questions": [
    {
      "questionId": "q1",
      "questionText": "...",
      "difficulty": "MEDIUM",
      "correct": true,
      "pointsEarned": 45,
      "timeSpent": 35,
      "userAnswer": "Option A",
      "correctAnswer": "Option A"
    }
  ]
}
```

---

### 6. Get User Tests
**✅ GET `/api/tests/list`**

Lists all tests for the user (completed and in-progress).

**Query Parameters:**
```
?status=completed|in_progress|all
?limit=10
?offset=0
?sortBy=createdAt|score|accuracy
```

**Response:**
```json
{
  "tests": [
    {
      "id": "test123",
      "title": "Tutor Test",
      "status": "completed",
      "score": 78.5,
      "totalPoints": 1245,
      "accuracy": 87.5,
      "totalQuestions": 20,
      "correctAnswers": 15,
      "completedAt": "2025-12-23T18:45:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

---

## 📊 Scoring & Points Endpoints

### 1. Get User Total Points
**GET `/api/quiz/points/total`**

Returns user's total accumulated points.

**Response:**
```json
{
  "userId": "user123",
  "totalPoints": 12450,
  "testCount": 42,
  "averagePointsPerTest": 296,
  "pointsThisWeek": 2150,
  "pointsThisMonth": 5340,
  "streak": {
    "current": 12,
    "longest": 23,
    "multiplier": 1.5
  }
}
```

---

### 2. Get Points Breakdown
**GET `/api/quiz/points/breakdown`**

Breaks down points by difficulty, system, topic.

**Query Parameters:**
```
?period=day|week|month|all
```

**Response:**
```json
{
  "byDifficulty": {
    "EASY": { "points": 2150, "questionsAnswered": 215, "accuracy": 95 },
    "MEDIUM": { "points": 5200, "questionsAnswered": 260, "accuracy": 87 },
    "HARD": { "points": 5100, "questionsAnswered": 170, "accuracy": 72 }
  },
  "bySystem": {
    "Cardiovascular": { "points": 3200 },
    "Neurology": { "points": 2800 }
  }
}
```

---

## 🏆 Leaderboard Endpoints

### 1. Get Global Leaderboard
**✅ GET `/api/leaderboard`**

Retrieves global rankings.

**Query Parameters:**
```
?timeframe=overall|weekly|monthly
?difficulty=all|EASY|MEDIUM|HARD
?limit=100
?offset=0
```

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user456",
      "userName": "Jane Doe",
      "avatar": "url",
      "averageScore": 92.3,
      "totalPoints": 15240,
      "testsCompleted": 52,
      "streak": 18,
      "percentile": 99.5
    }
  ],
  "timeframe": "overall",
  "updatedAt": "2025-12-23T17:30:00Z"
}
```

---

### 2. Get User's Rank
**✅ GET `/api/leaderboard/me`**

Gets current user's rank and nearby competitors.

**Response:**
```json
{
  "userRank": {
    "rank": 145,
    "userId": "user123",
    "userName": "John Doe",
    "averageScore": 78.2,
    "totalPoints": 8450,
    "percentile": 99,
    "pointsToNextRank": 125
  },
  "nearbyCompetitors": [
    {
      "rank": 144,
      "userName": "Jane Smith",
      "averageScore": 78.5,
      "difference": -0.3
    },
    {
      "rank": 146,
      "userName": "Bob Johnson",
      "averageScore": 77.9,
      "difference": 0.3
    }
  ]
}
```

---

### 3. Get Friends Leaderboard
**GET `/api/leaderboard/friends`**

Gets leaderboard of user's friends.

**Response:**
```json
{
  "friends": [
    {
      "rank": 1,
      "userName": "Alice Brown",
      "averageScore": 85.2,
      "streak": 15
    }
  ]
}
```

---

## 💡 AI Insights Endpoints

### 1. Get User Insights
**✅ GET `/api/insights`**

Retrieves AI-generated insights for the user.

**Query Parameters:**
```
?type=performance|pattern|weakness|motivation|adaptive|ranking
?unread=true
?limit=5
```

**Response:**
```json
{
  "insights": [
    {
      "id": "ins1",
      "type": "performance",
      "title": "Great improvement on ECG questions!",
      "content": "You got 8/10 correct! Your ECG interpretation improved by 15% compared to last week.",
      "metadata": {
        "improvement": 15,
        "topic": "ECG Interpretation",
        "currentAccuracy": 85,
        "previousAccuracy": 70
      },
      "isRead": false,
      "createdAt": "2025-12-23T17:30:00Z",
      "expiresAt": "2025-12-30T17:30:00Z"
    }
  ],
  "unreadCount": 3
}
```

---

### 2. Mark Insight as Read
**✅ POST `/api/insights/:id/read`**

Marks an insight as read.

**Response:**
```json
{
  "success": true,
  "insight": {
    "id": "ins1",
    "isRead": true,
    "readAt": "2025-12-23T18:00:00Z"
  }
}
```

---

### 3. Get Recommendations
**✅ GET `/api/insights/recommendations`**

Gets AI-generated learning recommendations.

**Response:**
```json
{
  "recommendations": [
    {
      "priority": 1,
      "type": "focus_area",
      "topic": "Pharmacology",
      "reason": "Lowest accuracy (62%)",
      "suggestedQuestions": 50,
      "estimatedTime": 45,
      "difficulty": "MEDIUM"
    }
  ]
}
```

---

## 📈 Progress Tracking Endpoints

### 1. Get User Progress
**✅ GET `/api/progress`**

Gets overall user progress and mastery levels.

**Response:**
```json
{
  "overall": {
    "masteryLevel": 78,
    "questionsAttempted": 2847,
    "correctAnswers": 2225,
    "successRate": 78.2
  },
  "bySystems": [
    {
      "system": "Cardiovascular",
      "masteryLevel": 95,
      "questionsAttempted": 456,
      "correctAnswers": 433,
      "lastAttempt": "2025-12-23T17:30:00Z"
    }
  ],
  "byTopics": [
    {
      "topic": "ECG Interpretation",
      "masteryLevel": 88,
      "questionsAttempted": 85,
      "correctAnswers": 75
    }
  ]
}
```

---

### 2. Get Specific System Progress
**✅ GET `/api/progress/system/:systemId`**

Gets detailed progress for a specific medical system.

**Response:**
```json
{
  "system": "Cardiovascular",
  "masteryLevel": 95,
  "topics": [
    {
      "topic": "ECG Interpretation",
      "masteryLevel": 88,
      "questionsAttempted": 85,
      "correctAnswers": 75,
      "accuracy": 88.2
    }
  ]
}
```

---

## 📝 Study Notes Endpoints

### 1. Create Note
**✅ POST `/api/notes`**

Creates a new study note.

**Request:**
```json
{
  "title": "ECG Interpretation Tips",
  "content": "Remember that ST-segment elevation...",
  "tags": ["ECG", "Cardiology"],
  "questionId": "q1",  // optional
  "systemId": "cardio" // optional
}
```

**Response:**
```json
{
  "success": true,
  "note": {
    "id": "note1",
    "title": "ECG Interpretation Tips",
    "content": "...",
    "tags": ["ECG", "Cardiology"],
    "isPinned": false,
    "createdAt": "2025-12-23T17:30:00Z"
  }
}
```

---

### 2. Get User Notes
**✅ GET `/api/notes`**

Retrieves all user notes.

**Query Parameters:**
```
?search=term
?tags=ECG,Cardiology
?isPinned=true|false
?limit=10
```

---

### 3. Update Note
**✅ PUT `/api/notes/:id`**

Updates a note.

---

### 4. Delete Note
**✅ DELETE `/api/notes/:id`**

Deletes a note.

---

## 🔍 Search Endpoints

### 1. Search Questions
**✅ GET `/api/search/questions`**

Full-text search for questions.

**Query Parameters:**
```
?q=search+term
?difficulty=EASY|MEDIUM|HARD|MIXED
?system=cardio
?topic=ecg
?limit=20
```

**Response:**
```json
{
  "results": [
    {
      "id": "q1",
      "text": "A 45-year-old man...",
      "difficulty": "MEDIUM",
      "system": "Cardiovascular",
      "topic": "ECG Interpretation",
      "yourAccuracy": 85,
      "attempts": 12
    }
  ],
  "total": 156
}
```

---

### 2. Search Users
**✅ GET `/api/search/users`**

Find users by name.

**Query Parameters:**
```
?q=name
?limit=10
```

---

### 3. Get Trending Questions
**✅ GET `/api/trending/questions`**

Most attempted questions this week.

**Query Parameters:**
```
?period=week|month|all
?limit=20
```

---

## 📊 Analytics Endpoints

### 1. Get Dashboard Analytics
**✅ GET `/api/analytics/dashboard`**

Comprehensive performance dashboard.

**Response:**
```json
{
  "performance": {
    "overallAccuracy": 78.2,
    "averageScore": 82.1,
    "estimatedReadiness": 68,
    "globalRank": 145
  },
  "activity": {
    "questionsThisWeek": 247,
    "testsThisWeek": 4,
    "studyTimeThisWeek": 750
  },
  "trends": {
    "weeklyGrowth": 1.2,
    "monthlyGrowth": 5.2,
    "projectedExamDate": "2026-03-01"
  },
  "breakdown": {
    "difficulty": {
      "EASY": 95.2,
      "MEDIUM": 82.5,
      "HARD": 68.9
    },
    "system": {
      "Cardiovascular": 85.3,
      "Neurology": 78.2
    }
  }
}
```

---

## 🏅 Achievements Endpoints

### 1. Get User Achievements
**✅ GET `/api/achievements`**

Gets user's earned achievements and available badges.

**Response:**
```json
{
  "unlockedAchievements": [
    {
      "id": "first_test",
      "name": "First Step",
      "description": "Complete your first test",
      "icon": "🎯",
      "points": 10,
      "unlockedAt": "2025-12-23T17:30:00Z"
    }
  ],
  "availableAchievements": [
    {
      "id": "test_10",
      "name": "Test Warrior",
      "description": "Complete 10 tests",
      "icon": "⚔️",
      "points": 25,
      "requirement": "testsCompleted >= 10"
    }
  ],
  "stats": {
    "totalUnlocked": 5,
    "totalAvailable": 15,
    "progressPoints": 100
  }
}
```

---

## 📬 Notifications Endpoints

### 1. Get Notifications
**✅ GET `/api/notifications`**

Retrieve user's notifications with filtering.

**Query Parameters:**
```
?isRead=true|false
?type=notification_type
?limit=20
?offset=0
```

---

### 2. Create Notification
**✅ POST `/api/notifications`**

Create a notification for user.

**Request:**
```json
{
  "type": "score_updated",
  "title": "Great score!",
  "content": "You scored 85% on your last test"
}
```

---

### 3. Mark Notification as Read
**✅ POST `/api/notifications/:id/read`**

Mark a notification as read.

---

## 💬 Messaging Endpoints

### 1. Get Messages
**✅ GET `/api/messages`**

Retrieve messages from a conversation.

**Query Parameters:**
```
?conversationId=conv123
?recipientId=user456
?limit=50
?offset=0
```

---

### 2. Send Message
**✅ POST `/api/messages`**

Send a message to another user.

**Request:**
```json
{
  "recipientId": "user456",
  "content": "Message content here"
}
```

---

### 3. Get Conversations
**✅ GET `/api/messages/conversations`**

List user's conversations.

**Query Parameters:**
```
?limit=10
?offset=0
```

---

## 🎓 Learning Paths Endpoints

### 1. Get Learning Paths
**✅ GET `/api/learning-paths`**

Retrieve available learning paths.

**Query Parameters:**
```
?status=in_progress|completed|all
?limit=10
?offset=0
```

---

### 2. Create Learning Path
**✅ POST `/api/learning-paths`**

Create a custom learning path.

**Request:**
```json
{
  "name": "Cardiology Mastery",
  "description": "Complete guide to cardiology",
  "topics": ["ECG", "Heart Disease"],
  "estimatedHours": 20
}
```

---

### 3. Get Learning Path Progress
**✅ GET `/api/learning-paths/:id/progress`**

Get progress on a learning path.

---

### 4. Update Learning Path Progress
**✅ POST `/api/learning-paths/:id/progress`**

Update progress on a learning path.

---

## 👨‍💼 Admin Panel Endpoints

### 1. Get Users
**✅ GET `/api/admin/users`**

Admin endpoint to view all users.

**Query Parameters:**
```
?search=username
?limit=50
?offset=0
```

---

### 2. Get Questions
**✅ GET `/api/admin/questions`**

Admin endpoint for question management.

**Query Parameters:**
```
?status=all|flagged|low-performance
?limit=50
?offset=0
```

---

### 3. Get Analytics
**✅ GET `/api/admin/analytics`**

Admin analytics dashboard.

---

## 🔐 Authentication Endpoints

### 1. Register
**POST `/api/auth/register`**

```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe"
}
```

---

### 2. Login
**POST `/api/auth/login`**

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

**Common Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

---

## Rate Limiting

- Standard: 100 requests per minute
- Authenticated: 1000 requests per minute
- Quiz submission: 10 requests per second per user

---

## Next APIs to Implement

Phase 2:
- Notifications API
- Messaging API
- Learning Paths API
- Admin Panel API

Phase 3:
- Reporting & Export API
- Achievements API
- Payment/Subscription API
- Advanced Analytics API

