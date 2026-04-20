# Ugent App - Complete System Architecture

## 🏗️ Overview
The Ugent application is a comprehensive medical education platform. Beyond quiz logic and leaderboards, it requires multiple interconnected systems to function effectively.

---

## 📋 Core Systems & Processes

### 1. USER MANAGEMENT SYSTEM
**Purpose**: Handle user authentication, profiles, and permissions

#### Sub-processes:
- **User Registration**
  - Email validation
  - Password hashing (bcryptjs)
  - Role assignment (STUDENT, INSTRUCTOR, ADMIN)
  - Email verification/confirmation

- **User Authentication**
  - Login/logout (NextAuth.js)
  - Session management
  - JWT token handling
  - Password reset/recovery
  - Two-factor authentication (optional)

- **User Profile Management**
  - Profile editing (name, avatar, bio)
  - Preference settings
  - Learning goals
  - Study preferences

- **Role-Based Access Control**
  - Student permissions
  - Instructor permissions
  - Admin permissions
  - Content creation limits

#### Database Tables Used:
- User
- Session (NextAuth)
- VerificationToken (NextAuth)

#### API Endpoints Needed:
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/user/profile
PUT    /api/user/profile
GET    /api/user/settings
PUT    /api/user/settings
```

---

### 2. QUESTION BANK MANAGEMENT
**Purpose**: Manage medical questions, organize by topic/system, handle versioning

#### Sub-processes:
- **Question Creation & Management**
  - Create questions (CRUD)
  - Add answer options (4-5 options)
  - Mark correct answer
  - Add detailed explanations
  - Difficulty assignment
  - Category/system/topic assignment

- **Question Organization**
  - Organize by medical systems (26+ systems)
  - Sub-organize by topics (200+ topics)
  - Organize by subjects (6+ subjects)
  - Tag-based organization
  - Question versioning

- **Question Quality Control**
  - Flag incorrect questions
  - Review flagged questions
  - Update/correct questions
  - Retire outdated questions
  - Track question metrics

- **Question Analytics**
  - Track attempts
  - Track success rate
  - Calculate average time
  - Identify difficult questions

#### Database Tables Used:
- Question
- AnswerOption
- System
- Topic
- Subject
- QuestionMetrics (new needed)

#### API Endpoints Needed:
```
GET    /api/questions (with filters)
GET    /api/questions/:id
POST   /api/questions (admin/instructor)
PUT    /api/questions/:id (admin/instructor)
DELETE /api/questions/:id (admin/instructor)
GET    /api/systems
GET    /api/systems/:id/topics
GET    /api/topics/:id/questions
GET    /api/subjects
POST   /api/questions/:id/flag
GET    /api/questions/:id/metrics
```

---

### 3. TEST/QUIZ ENGINE
**Purpose**: Create, manage, and track quiz sessions

#### Sub-processes:
- **Test Creation**
  - Create custom tests (manual selection)
  - Create adaptive tests (AI-selected)
  - Create practice tests
  - Set question count
  - Set time limits
  - Set difficulty distribution

- **Test Configuration**
  - Select by system/topic/subject
  - Randomize question order
  - Shuffle answer options
  - Set review options
  - Set retake policies

- **Test Taking**
  - Display questions sequentially
  - Handle answer submission
  - Real-time scoring
  - Time tracking per question
  - Flag questions for review
  - Show/hide explanations
  - Option to skip questions

- **Test Completion**
  - Calculate final score
  - Store results
  - Generate report
  - Suggest review areas

#### Database Tables Used:
- Test
- TestQuestion
- Answer
- TestSession
- QuestionScore

#### API Endpoints Needed:
```
POST   /api/tests/create
GET    /api/tests/:id
GET    /api/tests (user's tests)
POST   /api/tests/:id/start
POST   /api/tests/:id/submit-answer
POST   /api/tests/:id/complete
GET    /api/tests/:id/results
POST   /api/tests/:id/review
DELETE /api/tests/:id (if not started)
```

---

### 4. SCORING & POINTS SYSTEM ✅ (COMPLETED)
**Purpose**: Calculate quiz points with multipliers and bonuses

#### Sub-processes:
- **Points Calculation**
  - Base points by difficulty
  - Time bonus multiplier
  - Streak multiplier
  - Accuracy bonus

- **Leaderboard Ranking**
  - Calculate user averageScore
  - Assign global rank
  - Calculate percentile
  - Track growth rate

- **Achievement System** (new)
  - Badge system
  - Milestone tracking
  - Reward notifications

#### Database Tables Used:
- QuestionScore
- UserLeaderboard
- Achievement (new needed)

---

### 5. PROGRESS TRACKING & ANALYTICS
**Purpose**: Track user learning progress across topics and systems

#### Sub-processes:
- **Mastery Level Calculation**
  - Calculate per system
  - Calculate per topic
  - Calculate per subject
  - Set mastery thresholds

- **Performance Tracking**
  - Accuracy per topic
  - Question count per topic
  - Time spent per topic
  - Growth rate per topic

- **Study Time Tracking**
  - Daily study time
  - Weekly study time
  - Monthly study time
  - Session duration

- **Streak Tracking**
  - Current streak
  - Longest streak
  - Streak notifications

#### Database Tables Used:
- Progress
- PerformanceSummary
- StudyTime (new needed)
- Streak (new needed)

#### API Endpoints Needed:
```
GET    /api/progress/user
GET    /api/progress/system/:systemId
GET    /api/progress/topic/:topicId
GET    /api/progress/subject/:subjectId
GET    /api/analytics/dashboard
GET    /api/analytics/growth
GET    /api/analytics/mastery
GET    /api/analytics/time-distribution
```

---

### 6. AI INSIGHTS & RECOMMENDATIONS ✅ (COMPLETED)
**Purpose**: Generate personalized insights and recommendations

#### Sub-processes:
- **Performance Insights**
  - Analyze quiz results
  - Identify strengths
  - Identify weaknesses
  - Generate insights

- **Learning Pattern Detection**
  - Track study times
  - Identify peak performance hours
  - Identify best study days
  - Preferred difficulty

- **Personalized Recommendations**
  - Recommend topics to study
  - Suggest optimal study times
  - Recommend difficulty level
  - Suggest review topics

- **Prediction Models**
  - Predict exam readiness
  - Predict completion date
  - Predict score improvement

#### Database Tables Used:
- AIInsight
- LearningPattern
- PerformanceSummary

#### API Endpoints Needed:
```
GET    /api/insights (user's insights)
GET    /api/insights?type=performance
POST   /api/insights/:id/read
GET    /api/recommendations
GET    /api/recommendations/topics
GET    /api/analytics/predictions
GET    /api/analytics/readiness
```

---

### 7. NOTES & STUDY MATERIALS
**Purpose**: Allow users to create and manage study notes

#### Sub-processes:
- **Note Creation**
  - Create notes
  - Link to questions
  - Link to topics
  - Add tags

- **Note Organization**
  - Organize by system/topic
  - Search notes
  - Pin important notes
  - Archive old notes

- **Note Sharing**
  - Share with instructors
  - Share with friends
  - Public/private notes

#### Database Tables Used:
- StudyNote
- SharedNote (new needed)

#### API Endpoints Needed:
```
GET    /api/notes
GET    /api/notes/:id
POST   /api/notes
PUT    /api/notes/:id
DELETE /api/notes/:id
GET    /api/notes/search
POST   /api/notes/:id/share
```

---

### 8. GLOBAL LEADERBOARD ✅ (COMPLETED)
**Purpose**: Rank users and track competition

#### Sub-processes:
- **Ranking Calculation**
  - Calculate ranks
  - Update ranks
  - Handle ties

- **Leaderboard Views**
  - Overall leaderboard
  - Weekly leaderboard
  - Monthly leaderboard
  - Difficulty-specific leaderboards
  - Friend leaderboards

- **Notifications**
  - Rank change notifications
  - New high score notifications
  - Friend activity notifications

#### Database Tables Used:
- UserLeaderboard
- Leaderboard (new needed for weekly/monthly)

#### API Endpoints Needed:
```
GET    /api/leaderboard
GET    /api/leaderboard?timeframe=weekly
GET    /api/leaderboard?difficulty=HARD
GET    /api/leaderboard/me
GET    /api/leaderboard/friends
GET    /api/leaderboard/rank/:rank
```

---

### 9. NOTIFICATIONS & MESSAGING
**Purpose**: Keep users engaged with notifications and messages

#### Sub-processes:
- **Notification Types**
  - Score notifications
  - Rank change notifications
  - Streak notifications
  - Achievement notifications
  - Recommendation notifications
  - Friend activity notifications

- **Notification Delivery**
  - In-app notifications
  - Email notifications
  - Push notifications (mobile)
  - Notification preferences

- **Messaging**
  - Direct messages
  - Instructor feedback
  - Comments on shared content
  - Discussion forums (optional)

#### Database Tables Used:
- Notification (new needed)
- Message (new needed)
- NotificationPreference (new needed)

#### API Endpoints Needed:
```
GET    /api/notifications
POST   /api/notifications/:id/read
DELETE /api/notifications/:id
PUT    /api/user/notification-preferences
POST   /api/messages
GET    /api/messages/:conversationId
```

---

### 10. CONTENT CURATION & RECOMMENDATIONS
**Purpose**: Curate learning paths and recommend content

#### Sub-processes:
- **Learning Path Creation**
  - Create predefined paths
  - Create personalized paths
  - Track path progress
  - Suggest next topics

- **Question Recommendations**
  - Recommend weak area questions
  - Recommend similar difficulty
  - Recommend related topics
  - Adaptive difficulty adjustment

- **Content Filtering**
  - Filter by difficulty
  - Filter by system/topic
  - Filter by time available
  - Filter by performance level

#### Database Tables Used:
- LearningPath
- LearningPathProgress (new needed)
- Recommendation (new needed)

#### API Endpoints Needed:
```
GET    /api/learning-paths
GET    /api/learning-paths/:id
POST   /api/learning-paths (user-created)
GET    /api/learning-paths/:id/progress
POST   /api/learning-paths/:id/complete
GET    /api/recommendations/questions
```

---

### 11. REPORTING & EXPORT
**Purpose**: Generate reports and export data

#### Sub-processes:
- **Report Generation**
  - Test reports
  - Performance reports
  - Progress reports
  - Mastery reports

- **Data Export**
  - Export test results
  - Export performance data
  - Export learning path data
  - Export to PDF/Excel

- **Analytics Dashboard**
  - Visual performance charts
  - Trend analysis
  - Comparison analytics
  - Goal tracking

#### Database Tables Used:
- All performance tables

#### API Endpoints Needed:
```
GET    /api/reports/test/:testId
GET    /api/reports/performance
GET    /api/reports/mastery
POST   /api/reports/export?format=pdf
POST   /api/reports/export?format=csv
```

---

### 12. ADMIN PANEL & MODERATION
**Purpose**: Manage platform content and users

#### Sub-processes:
- **User Management**
  - View all users
  - Disable/enable users
  - Reset passwords
  - View user statistics

- **Content Management**
  - View flagged questions
  - Edit/delete questions
  - Manage question categories
  - Monitor question quality

- **Analytics**
  - Platform usage analytics
  - Question performance
  - User engagement metrics
  - System health metrics

- **Moderation**
  - Review flagged content
  - Handle disputes
  - Monitor for abuse

#### Database Tables Used:
- All tables

#### API Endpoints Needed:
```
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id
GET    /api/admin/questions/flagged
GET    /api/admin/analytics
GET    /api/admin/system-health
```

---

### 13. PAYMENT & SUBSCRIPTION (Optional)
**Purpose**: Handle premium features and subscriptions

#### Sub-processes:
- **Subscription Management**
  - Subscription plans
  - Payment processing
  - Renewal handling
  - Cancellation handling

- **Premium Features**
  - Unlimited tests
  - Advanced analytics
  - Priority support
  - Ad-free experience

- **Billing**
  - Invoice generation
  - Payment history
  - Refund handling

#### Database Tables Used:
- Subscription (new needed)
- Payment (new needed)
- Invoice (new needed)

---

### 14. SEARCH & DISCOVERY
**Purpose**: Help users find content

#### Sub-processes:
- **Question Search**
  - Full-text search
  - Filter by difficulty
  - Filter by topic
  - Filter by keyword

- **User Search**
  - Find friends
  - Find instructors
  - Add contacts

- **Trending/Popular**
  - Most attempted questions
  - Most discussed topics
  - Popular learning paths
  - Trending insights

#### Database Tables Used:
- Search indexes needed

#### API Endpoints Needed:
```
GET    /api/search/questions?q=term
GET    /api/search/users?q=term
GET    /api/search/topics?q=term
GET    /api/trending/questions
GET    /api/trending/topics
```

---

### 15. BACKUP & DATA SECURITY
**Purpose**: Protect user data and ensure continuity

#### Sub-processes:
- **Automated Backups**
  - Daily database backups
  - Incremental backups
  - Backup verification

- **Data Security**
  - Encryption at rest
  - Encryption in transit
  - Access logging
  - Audit trails

- **Disaster Recovery**
  - Recovery procedures
  - RTO/RPO targets
  - Testing procedures

---

## 🔄 System Interactions

### User Journey Flow:
```
Register → Login → Browse Topics → Create Test → Take Quiz
→ View Results → See Insights → Review Weak Areas
→ Check Leaderboard → Get Recommendations → Take More Tests
```

### Data Flow:
```
User Input → Answer Submission → Points Calculation →
Score Storage → Leaderboard Update → Insight Generation →
Notification Send → Analytics Update
```

---

## 🗄️ New Database Tables Needed

Beyond the 4 tables we created for quiz features:

```sql
-- Analytics & Tracking
CREATE TABLE StudyTime (
  id, userId, date, duration, topicId
);

CREATE TABLE Streak (
  id, userId, currentStreak, longestStreak, lastDate
);

-- Achievements
CREATE TABLE Achievement (
  id, name, description, criteria, icon
);

CREATE TABLE UserAchievement (
  id, userId, achievementId, unlockedAt
);

-- Notifications
CREATE TABLE Notification (
  id, userId, type, title, content, read, createdAt
);

CREATE TABLE NotificationPreference (
  id, userId, type, enabled, deliveryMethod
);

-- Messaging
CREATE TABLE Message (
  id, senderId, recipientId, content, read, createdAt
);

CREATE TABLE Conversation (
  id, participant1Id, participant2Id, lastMessage, updatedAt
);

-- Learning Paths
CREATE TABLE LearningPathProgress (
  id, learningPathId, userId, progress, startedAt, completedAt
);

-- Weekly/Monthly Leaderboards
CREATE TABLE LeaderboardSnapshot (
  id, week/month, userId, rank, score, type
);

-- Recommendations
CREATE TABLE Recommendation (
  id, userId, type, topicId, reason, createdAt
);

-- Search Index
CREATE TABLE SearchIndex (
  id, entityType, entityId, searchText, indexed
);

-- Audit Logs
CREATE TABLE AuditLog (
  id, userId, action, entityType, entityId, timestamp
);

-- Payment (if needed)
CREATE TABLE Subscription (
  id, userId, planId, startDate, endDate, status
);

CREATE TABLE Payment (
  id, userId, amount, method, status, date
);
```

---

## 📊 Key Metrics to Track

1. **User Metrics**
   - Active users (DAU, MAU)
   - User retention
   - Churn rate
   - User growth

2. **Engagement Metrics**
   - Tests per user
   - Questions answered
   - Study time
   - Feature usage

3. **Performance Metrics**
   - Average score
   - Average accuracy
   - Performance distribution
   - Growth rate

4. **System Metrics**
   - API response times
   - Database query times
   - Error rates
   - Server load

5. **Content Metrics**
   - Question difficulty distribution
   - Question success rates
   - Topic popularity
   - Content coverage

---

## 🚀 Implementation Priority

### Phase 1 (MVP - Currently Working)
- ✅ User Management
- ✅ Question Bank
- ✅ Test Engine
- ✅ Scoring System
- ✅ Progress Tracking
- ✅ AI Insights
- ✅ Leaderboard

### Phase 2 (Next)
- Notes & Study Materials
- Search & Discovery
- Notifications
- Learning Paths
- Admin Panel

### Phase 3 (Enhancement)
- Reporting & Export
- Messaging
- Achievements
- Advanced Analytics
- Payment/Subscription

### Phase 4 (Scaling)
- Mobile App
- Offline Support
- Advanced AI Models
- Content Recommendations
- Community Features

---

## 💡 Summary

The Ugent app is not just about quizzes and leaderboards. It's a complete learning ecosystem that requires:

1. **User Systems** - Registration, authentication, profiles
2. **Content Systems** - Question management, organization, curation
3. **Learning Systems** - Progress tracking, recommendations, insights
4. **Engagement Systems** - Leaderboards, notifications, achievements
5. **Support Systems** - Admin tools, reporting, analytics
6. **Infrastructure** - Backups, security, monitoring

Total estimated database tables: **25-30+**
Total estimated API endpoints: **100-150+**
Total estimated components: **50-80+**

This document provides the architectural foundation for building a scalable, feature-rich medical education platform.

