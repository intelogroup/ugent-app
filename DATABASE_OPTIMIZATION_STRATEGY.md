# Database Optimization Strategy for 10k Users

## Overview
This document outlines the database optimization strategy for scaling the ugent learning platform to handle 10,000+ concurrent users efficiently.

## 1. Data Access Patterns

### Read-Heavy Operations (95% of queries)
```
Daily Volume Estimates (10k active users):
- Question fetches: 500k+ reads/day
- Progress views: 100k+ reads/day
- Performance dashboards: 50k+ reads/day
- Leaderboard queries: 20k+ reads/day
- Test history: 30k+ reads/day
```

### Write Operations (5% of queries)
```
Daily Volume Estimates:
- Answer submissions: 250k+ writes/day
- Test creation: 10k+ writes/day
- Progress updates: 50k+ writes/day
- User interactions: 500k+ writes/day (analytics)
```

## 2. Table-by-Table Optimization

### 🔥 Question Table (Hottest - 500k+ reads/day)

**Current Indexes:**
```prisma
@@index([systemId])
@@index([topicId])
@@index([subjectId])
@@index([difficulty])
```

**Additional Indexes Needed:**
```sql
-- Composite index for common query patterns
CREATE INDEX idx_question_filters ON "Question" (difficulty, systemId, topicId)
  WHERE systemId IS NOT NULL AND topicId IS NOT NULL;

-- Success rate for adaptive learning
CREATE INDEX idx_question_success_rate ON "Question" (successRate DESC, difficulty);

-- Recently created questions
CREATE INDEX idx_question_recent ON "Question" (createdAt DESC);
```

**Optimization Strategy:**
1. **Denormalization**: Add computed fields
   - `systemName`, `topicName`, `subjectName` to avoid JOINs
   - Pre-calculate `successRateBucket` (easy/medium/hard performers)

2. **Caching Layer**:
   ```typescript
   // Redis cache structure
   Key: "questions:filter:{systemId}:{topicId}:{difficulty}"
   TTL: 1 hour
   Value: Array of question IDs
   ```

3. **Read Replica**: Route all question fetches to read replicas

4. **Partitioning**: Consider partitioning by `systemId` if data grows beyond 100k questions

**Sample Query Optimization:**
```typescript
// BEFORE (slow - multiple JOINs)
const questions = await prisma.question.findMany({
  where: { systemId, topicId, difficulty },
  include: { system: true, topic: true, options: true }
});

// AFTER (fast - denormalized + cached)
const cachedKey = `questions:${systemId}:${topicId}:${difficulty}`;
let questionIds = await redis.get(cachedKey);

if (!questionIds) {
  questionIds = await prisma.question.findMany({
    where: { systemId, topicId, difficulty },
    select: { id: true }
  });
  await redis.setex(cachedKey, 3600, JSON.stringify(questionIds));
}

// Fetch full questions with options (already indexed)
const questions = await prisma.question.findMany({
  where: { id: { in: questionIds } },
  include: { options: true }
});
```

---

### 🔥 Answer Table (High Write - 250k+ writes/day)

**Current Indexes:**
```prisma
@@unique([testId, questionId])
@@index([userId])
@@index([testId])
@@index([questionId])
@@index([isCorrect])
@@index([status])
```

**Optimization Strategy:**

1. **Batch Writes**: Group answer submissions
   ```typescript
   // Instead of individual writes
   await prisma.answer.createMany({
     data: answersArray, // Batch 10-50 answers
     skipDuplicates: true
   });
   ```

2. **Async Processing**:
   - Primary write: Save answer to DB
   - Background job: Update question metrics, user progress

3. **Write-Ahead Log**: Use message queue (Redis/RabbitMQ) for answer submissions
   ```
   User submits → Redis Queue → Batch processor → Database
   ```

4. **Partitioning**: Partition by `createdAt` (monthly) after 1M+ records

**Additional Index:**
```sql
-- For analytics queries
CREATE INDEX idx_answer_analytics ON "Answer" (userId, createdAt DESC, isCorrect)
  WHERE isCorrect IS NOT NULL;
```

---

### 🔥 User & PerformanceSummary (100k+ reads/day)

**Optimization Strategy:**

1. **Redis Cache**: Cache entire PerformanceSummary object
   ```typescript
   Key: "user:perf:{userId}"
   TTL: 5 minutes
   Value: JSON of PerformanceSummary
   ```

2. **Materialized Views**: Pre-compute aggregations
   ```sql
   -- Daily job to refresh
   CREATE MATERIALIZED VIEW user_daily_stats AS
   SELECT
     userId,
     COUNT(*) as daily_questions,
     AVG(CASE WHEN isCorrect THEN 1 ELSE 0 END) as daily_accuracy,
     DATE(createdAt) as stat_date
   FROM "Answer"
   GROUP BY userId, DATE(createdAt);

   CREATE INDEX ON user_daily_stats(userId, stat_date);
   ```

3. **Incremental Updates**: Don't recalculate everything
   ```typescript
   // Update only changed fields
   await prisma.performanceSummary.update({
     where: { userId },
     data: {
       totalQuestionsAnswered: { increment: 1 },
       totalCorrectAnswers: { increment: isCorrect ? 1 : 0 },
       // Recalculate accuracy = totalCorrect / totalAnswered
     }
   });
   ```

---

### 💾 UserInteraction (500k+ writes/day - Analytics)

**Problem**: This table will grow to millions of records quickly and slow down the main database.

**Solution**: Separate analytics database

1. **Use Time-Series Database**:
   - PostgreSQL TimescaleDB extension
   - Or separate ClickHouse/Elasticsearch for analytics

2. **Async Write**:
   ```typescript
   // Don't block main flow
   await kafka.send({
     topic: 'user-interactions',
     messages: [{ key: userId, value: interactionData }]
   });
   ```

3. **Retention Policy**: Keep only 90 days of raw data
   ```sql
   -- Auto-delete old records
   DELETE FROM "UserInteraction" WHERE createdAt < NOW() - INTERVAL '90 days';
   ```

4. **Aggregated Summary Tables**:
   ```sql
   CREATE TABLE "UserInteractionSummary" (
     userId TEXT,
     actionType TEXT,
     date DATE,
     count INT,
     PRIMARY KEY (userId, actionType, date)
   );
   ```

---

### 🎯 Test Table (Medium Read/Write)

**Optimization Strategy:**

1. **Status-Based Index**: Most queries filter by status
   ```sql
   CREATE INDEX idx_test_active ON "Test" (userId, status, lastActivityAt DESC)
     WHERE status IN ('ACTIVE', 'PAUSED');
   ```

2. **Soft Delete Completed Tests**: Archive after 30 days
   ```sql
   -- Move to cold storage
   CREATE TABLE "TestArchive" (LIKE "Test");

   -- Monthly job
   INSERT INTO "TestArchive"
   SELECT * FROM "Test"
   WHERE completedAt < NOW() - INTERVAL '30 days';
   ```

---

## 3. Question Bank Structure

### Recommended Structure for Efficient Queries

```typescript
// Question Selection Query Patterns (Most Common)

// Pattern 1: Random questions by filters (80% of queries)
SELECT * FROM "Question"
WHERE systemId = ? AND topicId = ? AND difficulty = ?
ORDER BY RANDOM()
LIMIT 50;

// Pattern 2: Adaptive difficulty (15% of queries)
SELECT * FROM "Question"
WHERE systemId = ? AND successRate BETWEEN 40 AND 70
ORDER BY RANDOM()
LIMIT 20;

// Pattern 3: Weak areas (5% of queries)
SELECT q.* FROM "Question" q
JOIN "Progress" p ON q.topicId = p.topicId
WHERE p.userId = ? AND p.successRate < 60
ORDER BY RANDOM()
LIMIT 30;
```

### Optimization: Pre-computed Question Pools

Instead of random selection on every test:

```typescript
// Create daily question pools
CREATE TABLE "QuestionPool" (
  id TEXT PRIMARY KEY,
  systemId TEXT,
  topicId TEXT,
  difficulty DifficultyLevel,
  questionIds TEXT[], -- Array of question IDs
  refreshedAt TIMESTAMP,

  INDEX (systemId, topicId, difficulty)
);

// Background job refreshes pools daily
// Tests select from pre-shuffled pools (instant)
```

---

## 4. Caching Strategy

### Redis Cache Layers

```typescript
// Layer 1: Hot Data (5-minute TTL)
"user:{userId}:performance"          // PerformanceSummary
"user:{userId}:active-test"          // Current test
"leaderboard:global:top100"          // Top 100 users

// Layer 2: Warm Data (1-hour TTL)
"questions:pool:{system}:{topic}:{difficulty}"  // Question IDs
"system:{systemId}:stats"            // System metadata
"user:{userId}:progress"             // Progress summaries

// Layer 3: Cold Data (24-hour TTL)
"question:{questionId}:full"         // Full question with options
"test:{testId}:questions"            // Test questions list
```

### Cache Invalidation Strategy

```typescript
// On answer submission
await redis.del(`user:${userId}:performance`);
await redis.del(`user:${userId}:progress`);

// On new question added
await redis.del(`questions:pool:${systemId}:${topicId}:*`);

// On user rank change
await redis.del('leaderboard:global:*');
```

---

## 5. Database Configuration

### PostgreSQL Tuning (for Supabase)

```sql
-- Increase shared buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '4GB';

-- Increase work_mem for complex queries
ALTER SYSTEM SET work_mem = '64MB';

-- Increase effective_cache_size (50% of RAM)
ALTER SYSTEM SET effective_cache_size = '8GB';

-- Enable parallel queries
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Better autovacuum for high-write tables
ALTER TABLE "Answer" SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE "UserInteraction" SET (autovacuum_vacuum_scale_factor = 0.02);
```

### Connection Pooling

```typescript
// Use PgBouncer (included with Supabase)
// Connection pool configuration
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true"

// Pool size recommendations for 10k users
// Min pool: 20 connections
// Max pool: 100 connections
// Pool mode: transaction (not session)
```

---

## 6. Monitoring & Alerts

### Key Metrics to Track

1. **Query Performance**:
   - Slow query log (>100ms)
   - Query patterns by table
   - Index usage statistics

2. **Database Health**:
   - Connection pool utilization
   - Cache hit ratio (target: >95%)
   - Table bloat (autovacuum effectiveness)

3. **Application Metrics**:
   - Average test load time
   - Answer submission latency
   - Dashboard render time

### Supabase Dashboard Queries

```sql
-- Find slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::text)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;
```

---

## 7. Scaling Roadmap

### Phase 1: 0-1k users (Current)
- ✅ Basic indexes
- ✅ Prisma ORM
- ✅ Single database

### Phase 2: 1k-10k users (Next 3 months)
- 🎯 Implement Redis caching
- 🎯 Add composite indexes
- 🎯 Question pool pre-generation
- 🎯 Read replica for queries
- 🎯 Connection pooling optimization

### Phase 3: 10k-50k users (6-12 months)
- 📋 Separate analytics database
- 📋 Table partitioning (Answer, UserInteraction)
- 📋 CDN for static content
- 📋 Horizontal scaling (multiple app servers)

### Phase 4: 50k+ users (12+ months)
- 📋 Microservices architecture
- 📋 Distributed caching (Redis Cluster)
- 📋 Database sharding by userId
- 📋 Event-driven architecture (Kafka)

---

## 8. Implementation Checklist

- [ ] Add composite indexes to Question table
- [ ] Implement Redis caching layer
- [ ] Create QuestionPool table and refresh job
- [ ] Optimize Answer table with batch writes
- [ ] Set up read replica routing
- [ ] Move UserInteraction to time-series DB
- [ ] Configure PostgreSQL tuning
- [ ] Set up monitoring dashboard
- [ ] Create weekly performance review process
- [ ] Document query patterns for developers

---

## Next Steps

1. **Immediate**: Add missing indexes (today)
2. **This Week**: Implement Redis caching for PerformanceSummary
3. **This Month**: Create QuestionPool system and seed data
4. **Next Quarter**: Set up read replica and analytics separation
