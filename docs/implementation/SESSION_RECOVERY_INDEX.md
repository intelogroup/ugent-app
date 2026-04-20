# Quiz Session Recovery - Complete Documentation Index

## Overview

Comprehensive system for handling mid-quiz interruptions, session recovery, and incomplete quiz evaluation. Three documents provide complete architecture, database design, and API specifications.

---

## 📋 Documentation Files

### 1. **QUIZ_SESSION_RECOVERY_DESIGN.md** (Primary Architecture Document)
**Purpose**: Complete system design and problem analysis

**Contains**:
- Problem statement (what gaps we're solving)
- Key questions to resolve (unanswered vs skipped, resumption policy, fairness)
- Proposed database schema with detailed explanations
- Recovery workflow scenarios
- Timeout and resumption policies
- Scoring logic options (3 different approaches)
- Migration path using Prisma

**Key Sections**:
- Database Schema Improvements (complete model definitions)
- Recovery Workflow (3 detailed scenarios)
- Scoring Logic for Incomplete Quizzes (A/B/C options)
- Session Timeout Policy
- Auto-Recovery Patterns
- Implementation Priority (3 phases)

**Read This For**: Understanding the "why" behind each design decision

---

### 2. **SCHEMA_MIGRATION_SESSION_RECOVERY.md** (Database Migration Guide)
**Purpose**: Technical specification for database changes

**Contains**:
- Changes to implement (enums, models, fields)
- New enums (TestStatus, AbandonReason, UnansweredHandling)
- Enhanced Test model with all session fields
- Enhanced Answer model with recovery fields
- New TestSession model (track all sessions)
- New StatusEvent model (audit trail)
- New TestPolicy model (configuration)
- Enhanced QuestionScore model (incomplete handling)

**Includes**:
- Migration steps (step-by-step)
- Raw SQL migration (for non-Prisma users)
- Index creation for performance
- Backward compatibility notes
- Data validation rules

**Benefits**:
1. Session Recovery: Track paused sessions, resumption windows
2. Incomplete Handling: Clear marking of unanswered vs skipped
3. Audit Trail: Complete history of all state changes
4. Performance: Proper indexes for efficient queries
5. Backward Compatibility: Old data continues to work

**Read This For**: Database implementation and migration

---

### 3. **SESSION_RECOVERY_ENDPOINTS.md** (API Implementation Guide)
**Purpose**: Technical specification for 6 new API endpoints

**Contains 6 Endpoints**:

1. **POST /api/tests/:id/heartbeat**
   - Client sends every 5 seconds
   - Keeps session alive
   - Detects disconnections

2. **POST /api/tests/:id/pause**
   - Graceful pause when user quits
   - Records pause reason
   - Returns resume window

3. **GET /api/tests/:id/resume**
   - Check if can resume
   - Get current state
   - Return session token

4. **GET /api/tests/:id/status**
   - Quick status check
   - Recommended action
   - Active session info

5. **POST /api/tests/:id/auto-complete**
   - Auto-complete after timeout
   - Apply scoring policy
   - Mark remaining questions

6. **GET /api/tests/:id/recovery-history**
   - View all sessions
   - Pause/resume timeline
   - Event audit log

**Includes**:
- Request/response specifications (JSON examples)
- Backend implementation example (TypeScript)
- Frontend heartbeat system (React hooks)
- Client-side detection strategies
- State transition diagram
- Data considerations

**Read This For**: Implementing the API endpoints and client-side logic

---

## 🎯 Key Concepts

### Session Status States
```
ACTIVE        → Normal quiz taking
PAUSED        → Quiz paused (can resume)
RESUMED       → Resumed from pause
COMPLETED     → Quiz finished
ABANDONED     → User quit
TIMEOUT       → Inactivity timeout
INCOMPLETE    → Completed but with missing questions
```

### Unanswered Question Policies

**Option A: SKIPPED (Recommended)**
- Not counted in score
- Not counted in accuracy
- Not counted in mastery
- Fair for disconnections

**Option B: INCORRECT (Strict)**
- Counted as wrong answer
- Impacts accuracy negatively
- Impacts mastery
- Harsh penalty

**Option C: PARTIAL + Penalty (Moderate)**
- Counted but with 10% penalty
- Based on answered questions
- Weighted differently
- Balanced approach

### Recovery Windows
- **Resume Deadline**: 15 minutes after pause
- **Max Resume Attempts**: 3 times
- **Auto-Pause Timeout**: 30 minutes inactivity
- **Session Token**: Unique per test per user

---

## 📊 Implementation Roadmap

### Phase 1: Critical (Schema + Core Endpoints)
1. Add enums (TestStatus, AbandonReason, etc.)
2. Enhance Test model (session fields)
3. Create TestSession model (track attempts)
4. Create StatusEvent model (audit trail)
5. Implement heartbeat endpoint
6. Implement pause endpoint
7. Implement resume endpoint

### Phase 2: Important (UI + Features)
8. Implement status endpoint
9. Implement auto-complete endpoint
10. Add client-side heartbeat
11. Add "Resume Quiz" button on dashboard
12. Update leaderboard for incomplete
13. Update progress tracking

### Phase 3: Enhancement (Analytics)
14. Recovery history endpoint
15. Admin analytics dashboard
16. Abandonment prediction
17. Performance optimization

---

## 🔄 User Flows

### Network Disconnect & Recovery
```
User taking quiz Q8/Q20
↓
Network drops
↓
Heartbeat fails after 3 retries
↓
Client shows "Connection Lost - Reconnecting..."
↓
User reconnects to internet
↓
System detects paused quiz
↓
Dashboard shows "Resume Quiz from Q8"
↓
User clicks Resume
↓
Resumes from Q8/Q20
↓
Completes all 20 questions
↓
Score includes all 20 questions
```

### User Abandonment (No Resume)
```
User takes Q1-Q10/Q20
↓
User closes tab
↓
No heartbeat for 30 minutes
↓
Server auto-pauses quiz
↓
Resume deadline set to 15 min
↓
User doesn't return within 15 min
↓
Quiz auto-completes with:
  - Q1-Q10: Actual answers
  - Q11-Q20: UNANSWERED (SKIPPED)
↓
Score calculated on Q1-Q10 only
↓
Quiz appears in history as "Incomplete"
↓
Leaderboard shows: "Incomplete - 7/10 correct"
```

### Browser Crash Recovery
```
Quiz at Q7/Q20
↓
Browser crashes
↓
User reopens application
↓
System detects paused quiz
↓
Shows "Resume Quiz (Q7/Q20)" button
↓
User can:
  - Resume from Q7
  - Start fresh quiz
  - Review quiz history
```

---

## 🔒 Security & Validation

### Session Token Security
- Unique per test per user
- Generated on test start
- Verified on every heartbeat/resume
- Invalidated after completion

### Resume Deadline
- Prevents unlimited resumption
- 15-minute window (configurable)
- Auto-abandons after deadline

### Attempt Limits
- Max 3 resume attempts
- Prevents quiz gaming
- Logged in audit trail

### Data Validation
- Verify userId matches
- Verify test belongs to user
- Verify sessionToken matches
- Verify deadline hasn't passed

---

## 📈 Database Changes Summary

### New Enums (4)
- `TestStatus` (7 states)
- `AbandonReason` (5 reasons)
- `UnansweredHandling` (3 options)
- `AnswerStatus` (enhanced with 4 new values)

### Enhanced Models (2)
- `Test` (+12 fields for session management)
- `Answer` (+3 fields for recovery tracking)
- `QuestionScore` (+3 fields for incomplete handling)

### New Models (3)
- `TestSession` (track all session instances)
- `StatusEvent` (audit trail of state changes)
- `TestPolicy` (configurable policies)

### Total Changes
- 4 new enums
- 3 existing models enhanced
- 3 new tables created
- 15+ new fields
- 8+ new indexes
- 0 breaking changes (backward compatible)

---

## 🎓 Recommended Reading Order

1. **First**: Read `QUIZ_SESSION_RECOVERY_DESIGN.md`
   - Understand the problem and solution
   - Learn about different options
   - Get the big picture

2. **Second**: Read `SCHEMA_MIGRATION_SESSION_RECOVERY.md`
   - Understand database changes
   - Learn migration steps
   - Prepare for implementation

3. **Third**: Read `SESSION_RECOVERY_ENDPOINTS.md`
   - Understand API specifications
   - Learn implementation details
   - See code examples

---

## ✅ Implementation Checklist

### Database
- [ ] Create migration file
- [ ] Add new enums
- [ ] Update Test model
- [ ] Update Answer model
- [ ] Create TestSession model
- [ ] Create StatusEvent model
- [ ] Create TestPolicy model
- [ ] Run migration
- [ ] Test backward compatibility

### Backend
- [ ] Implement heartbeat endpoint
- [ ] Implement pause endpoint
- [ ] Implement resume endpoint
- [ ] Implement status endpoint
- [ ] Implement auto-complete endpoint
- [ ] Implement recovery-history endpoint
- [ ] Add error handling
- [ ] Add validation
- [ ] Add security checks

### Frontend
- [ ] Implement heartbeat system
- [ ] Add pause functionality
- [ ] Add resume detection
- [ ] Show resume button on dashboard
- [ ] Handle connection loss
- [ ] Show timeout warnings
- [ ] Add pause/resume UI

### Testing
- [ ] Unit tests for heartbeat
- [ ] Unit tests for pause/resume
- [ ] Integration test: disconnect & resume
- [ ] Integration test: timeout & auto-complete
- [ ] Test incomplete scoring
- [ ] Test session tokens
- [ ] Load test heartbeat endpoint

### Deployment
- [ ] Run Prisma migration on staging
- [ ] Test on staging environment
- [ ] Performance testing
- [ ] Backup production database
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Enable new features

---

## 🔍 Key Metrics to Track

### Per User
- Abandonment rate (% of quizzes started but not completed)
- Resume success rate (% of resumed quizzes completed)
- Average time to completion
- Disconnect frequency
- Session recovery effectiveness

### Platform
- Platform abandonment rate
- Most common disconnect reasons
- Average incomplete quiz rate
- Session recovery success rate
- Timeout vs user quit ratio

### Performance
- Heartbeat endpoint response time
- Resume endpoint response time
- Average session recovery time
- Database query performance

---

## 📞 Support & Questions

For questions about:

**Architecture & Design**
- See: QUIZ_SESSION_RECOVERY_DESIGN.md
- Section: "Proposed Solution Architecture"

**Database Changes**
- See: SCHEMA_MIGRATION_SESSION_RECOVERY.md
- Section: "Changes to Implement"

**API Implementation**
- See: SESSION_RECOVERY_ENDPOINTS.md
- Section: "New Endpoints Required"

**Scoring Logic**
- See: QUIZ_SESSION_RECOVERY_DESIGN.md
- Section: "Scoring Logic for Incomplete Quizzes"

**Security**
- See: SESSION_RECOVERY_ENDPOINTS.md
- Section: "Client-Side Detection Strategies"

---

## 📚 Related Documentation

Also see:
- `API_DOCUMENTATION.md` - All 32+ endpoints
- `IMPLEMENTATION_INDEX.md` - General implementation guide
- `SYSTEM_ARCHITECTURE.md` - Overall system design

---

**Status: Complete & Ready for Implementation ✅**

All three documents provide comprehensive specification for implementing quiz session recovery. Start with the design document to understand the "why", then use the other two for implementation details.

Last Updated: December 24, 2025
