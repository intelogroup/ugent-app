# Database Migration using Supabase MCP

The Supabase MCP server is now installed and ready to use for direct database migrations through Claude Code!

## What's Installed

✅ **Supabase MCP Server**
- Project: yxuzslfctaattbcquamt
- URL: https://mcp.supabase.com/mcp?project_ref=yxuzslfctaattbcquamt
- Status: Ready to use

✅ **Prisma Configuration**
- prisma/schema.prisma - All 15+ data models defined
- prisma/seed.ts - Seed script for subjects, systems, topics
- .env.local - Supabase credentials configured
- prisma.config.ts - TypeScript configuration

✅ **Project Setup**
- Seed script ready with 6 subjects, 26 systems, 250+ topics
- All database relationships configured
- Indexes optimized for performance

## Method 1: Using Supabase MCP Directly (Recommended)

You can now run migrations directly through the Supabase MCP server:

### Step 1: Authenticate with Supabase MCP

In your terminal (not IDE):
```bash
cd /Users/kalinovdameus/Developer/Ugent/ugent-app
claude /mcp
```

Then:
1. Select **"supabase"** server
2. Choose **"Authenticate"**
3. Follow the OAuth flow to authorize
4. Done!

### Step 2: Use Claude Code to Run Migrations

Once authenticated, you can ask Claude Code to:

**Example 1: Create all tables**
```
@claude Run Prisma migrations to create all database tables
```

**Example 2: Seed the data**
```
@claude Execute the seed script to add subjects, systems, and topics
```

**Example 3: View database**
```
@claude Show me the subjects and systems created in the database
```

The MCP will handle all the SQL operations directly through Supabase!

---

## Method 2: Traditional Prisma CLI

If you prefer using Prisma directly:

### Step 1: Create Tables
```bash
npm run prisma:migrate
```

### Step 2: Seed Data
```bash
npm run prisma:seed
```

Or combined:
```bash
npm run db:setup
```

---

## Method 3: SQL Commands Through Supabase Dashboard

Alternatively, you can use Supabase dashboard directly:

1. Go to https://supabase.com/dashboard
2. Select your project (yxuzslfctaattbcquamt)
3. Go to **SQL Editor**
4. Paste and run the migration SQL (shown below)

### Migration SQL

The Prisma schema will be compiled into SQL. You can generate it:

```bash
npx prisma migrate dev --name init
```

This generates the SQL in `prisma/migrations/` folder.

---

## What the Migration Creates

### 15+ Tables
```
Users & Auth
├── User
└── UserLeaderboard

Content Management
├── Subject (6 records)
├── System (26 records)
├── Topic (250+ records)
├── Question
└── AnswerOption

Testing & Assessment
├── Test
├── TestQuestion
├── Answer
└── TestSession

Analytics & Tracking
├── UserInteraction
├── Progress
├── StudyNote
├── ReviewHistory
└── LearningPath
```

### Data Added
```
✅ 6 Subjects
✅ 26 Medical Systems
✅ 250+ Topics
✅ All relationships configured
✅ Indexes optimized
```

---

## Seed Script Details

The seed script (`prisma/seed.ts`) creates:

**6 Subjects**
- Anatomy (245 questions)
- Physiology (289 questions)
- Biochemistry (198 questions)
- Pathology (312 questions)
- Pharmacology (356 questions)
- Microbiology (234 questions)

**26 Systems with 250+ Topics**

Examples:

**Cardiovascular System** (11 topics)
- Coronary heart disease
- Valvular heart diseases
- Cardiac arrhythmias
- Hypertension
- Heart failure and shock
- ... (6 more)

**Nervous System** (16 topics)
- Cerebrovascular disease
- Seizures and epilepsy
- Neurodegenerative disorders
- Spinal cord disorders
- Traumatic brain injuries
- ... (11 more)

**Gastrointestinal & Nutrition** (10 topics)
- Hepatic disorders
- Gastrointestinal tumors
- Inflammatory bowel disease
- ... (7 more)

---

## Using MCP with Claude Code

Once MCP is authenticated, you can:

### Query the Database
```
Show me all medical systems
List all topics in the Cardiovascular system
Count how many topics total
```

### Manage Data
```
Add a new system
Update a topic name
Delete a topic (be careful!)
```

### Check Status
```
Are all tables created?
How many subjects exist?
Show me the schema
```

### Run Queries
```
SELECT all subjects
SELECT topics for system X
SELECT questions by difficulty
```

---

## Troubleshooting

### MCP Not Working
```
Error: supabase server not authenticated
```
**Solution**:
```bash
claude /mcp
# Select supabase and Authenticate
```

### Still Getting Migration Errors
Use the traditional method:
```bash
npm run db:setup
```

### Check Environment Variables
```bash
cat .env.local
```

Ensure DATABASE_URL and DIRECT_URL have your actual password (not [YOUR-PASSWORD]).

### Verify Supabase Connection
```bash
npx prisma db execute --stdin < /dev/null
```

---

## Next Steps

1. **Authenticate MCP** (if not done):
   ```bash
   claude /mcp
   # Select supabase → Authenticate
   ```

2. **Create Tables** - Either:
   - Use MCP: Ask Claude to run migrations
   - Use CLI: `npm run db:setup`

3. **Verify** - Check Supabase dashboard:
   - Go to SQL Editor
   - Run: `SELECT COUNT(*) FROM "Subject";`
   - Should show: 6

4. **Start Using** - API endpoints are ready:
   - Create tests
   - Submit answers
   - Track interactions

---

## MCP Resources

- **MCP Documentation**: https://modelcontextprotocol.io
- **Supabase MCP**: https://mcp.supabase.com
- **Claude Code Docs**: https://claude.com/claude-code

---

## Summary

You now have:
✅ Supabase MCP installed and configured
✅ Prisma schema ready
✅ Seed script with all medical data
✅ Multiple ways to run migrations

**Choose your preferred method and start building!**

---

**Status**: 🚀 Ready for migration!

Run `claude /mcp` to authenticate, then you can migrate your database!
