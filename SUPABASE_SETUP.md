# UGent App - Supabase Integration Guide

Perfect! You have a Supabase project set up. This guide will help you connect your UGent app to your Supabase PostgreSQL database and enable MCP integration with Claude Code.

## Project Information

- **Project Ref**: `yxuzslfctaattbcquamt`
- **Supabase URL**: `https://yxuzslfctaattbcquamt.supabase.co`
- **Database**: PostgreSQL (managed by Supabase)
- **Region**: Auto-configured

## Step 1: Get Connection String

### From Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `ugent` (yxuzslfctaattbcquamt)
3. Go to **Settings** → **Database** → **Connection string**
4. Select **"Prisma"** from the framework dropdown
5. Copy the entire connection string

The format will look like:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?schema=public&sslmode=require
```

### Step 2: Update Environment Variables

Edit `.env.local` and replace the placeholder:

```bash
# .env.local

DATABASE_URL="[PASTE_YOUR_CONNECTION_STRING_HERE]"

# Example (DO NOT USE - GET YOUR OWN):
# DATABASE_URL="postgresql://postgres.yxuzslfctaattbcquamt:YOUR_PASSWORD@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public&sslmode=require"
```

### Step 3: Get API Keys

From **Settings** → **API**, copy:

1. **Project URL**: https://yxuzslfctaattbcquamt.supabase.co
2. **Anon Key**: (public, safe for frontend)
3. **Service Role Key**: (secret, for backend only)

Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://yxuzslfctaattbcquamt.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-from-dashboard"
SUPABASE_SERVICE_KEY="your-service-role-key-from-dashboard"
```

## Step 4: Initialize Database with Prisma

```bash
cd /Users/kalinovdameus/Developer/Ugent/ugent-app

# 1. Generate Prisma Client
npx prisma generate

# 2. Create migrations for Supabase
npx prisma migrate dev --name init

# This will:
# - Connect to your Supabase database
# - Create all tables from schema.prisma
# - Generate migration files
# - Create Prisma Client types
```

If you get SSL errors, ensure your connection string includes `?sslmode=require`

## Step 5: Verify Connection

```bash
# Open Prisma Studio to view your database
npx prisma studio

# This opens: http://localhost:5555
# You can browse all tables and data visually
```

## Step 6: Set Up Supabase MCP (Optional but Recommended)

This allows Claude Code to interact with your Supabase project directly.

### Install MCP Server

Run this in your terminal:

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=yxuzslfctaattbcquamt"
```

Or manually add to `.mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=yxuzslfctaattbcquamt"
    }
  }
}
```

### Authenticate with Supabase

In a regular terminal (not IDE extension):

```bash
claude /mcp
```

Then:
1. Select the "supabase" server
2. Choose "Authenticate"
3. Follow the OAuth flow to authorize Claude Code
4. You're done!

## What Supabase Provides

### PostgreSQL Database
- Fully managed PostgreSQL (latest version)
- Automatic backups
- Point-in-time recovery
- SSL connections (secure)

### Realtime Capabilities (Future Use)
- WebSocket connections
- Listen to database changes
- Broadcast messages
- Presence tracking

### Authentication (Future Use)
- Built-in user management
- OAuth providers
- JWT tokens
- Multi-factor authentication

### Storage (Future Use)
- Object storage for files
- Images, documents, etc.
- CDN delivery

### Vector Search (Future Use - AI Features)
- pgvector extension installed
- Embeddings storage
- Similarity search for AI recommendations

## Database Limitations & Quotas

**Free Tier**:
- 500MB database size
- Up to 2 projects
- SSL included

**Pro Tier**:
- Starts at $25/month
- 8GB database size
- Priority support
- Advanced features

Check current pricing: https://supabase.com/pricing

## Security Best Practices

### 1. Never Commit Secrets
```bash
# .env.local is in .gitignore
# Never commit API keys or passwords
```

### 2. Use Service Role Key Securely
```typescript
// ✅ Good - Server-side only
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY  // ← Only in .env (not .env.public)
);

// ❌ Bad - Don't expose this
const response = await fetch('/api/endpoint', {
  headers: { 'Authorization': SUPABASE_SERVICE_KEY }
});
```

### 3. Row Level Security (RLS)
Enable RLS on tables to ensure users can only access their own data:

```sql
-- In Supabase SQL editor

-- Enable RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tests
CREATE POLICY "Users can view own tests"
  ON public.tests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tests"
  ON public.tests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 4. Change Database Password
In Supabase **Settings** → **Database**:
1. Click "Reset database password"
2. Copy new password
3. Update DATABASE_URL in .env.local

## Troubleshooting Supabase Connection

### Connection Refused Error
```
Error: connect ECONNREFUSED
```

Solution:
- Verify DATABASE_URL is correct
- Check that `?sslmode=require` is included
- Ensure your IP is allowed (Supabase allows all IPs by default)

### Authentication Failed Error
```
Error: password authentication failed for user "postgres"
```

Solution:
- Copy the password from Supabase dashboard again
- URL-encode special characters in password
- Reset database password in Supabase Settings

### SSL Certificate Error
```
Error: self signed certificate in certificate chain
```

Solution:
- Add `?sslmode=require` to connection string
- Or `?sslmode=disable` for local testing only (NOT for production)

### Table Already Exists Error
```
Error: relation "User" already exists
```

Solution:
```bash
# Reset migrations (development only)
npx prisma migrate reset
```

## Monitoring & Debugging

### View Connection in Supabase
1. Go to **Settings** → **Database**
2. Scroll to "Connections"
3. See active connections, queries, and performance

### View Logs
In Supabase dashboard:
1. **Logs** → **Database**
2. See all queries, errors, and performance metrics
3. Use for debugging slow queries

### Analyze Query Performance
```bash
# In Supabase SQL Editor, run:
EXPLAIN ANALYZE SELECT * FROM questions WHERE difficulty = 'HARD';
```

## Backup & Recovery

### Automatic Backups
Supabase automatically backs up your database:
- Daily backups (7-day retention on free tier)
- Weekly backups (90-day retention on pro tier)
- Point-in-time recovery available

### Manual Backup
In Supabase **Settings** → **Backups**:
1. Click "Request backup"
2. Backup is created immediately
3. Download or restore from here

### Restore from Backup
```bash
# Contact Supabase support to restore
# They handle the restoration process
```

## Scaling Considerations

### Database Growth
- Monitor database size in **Settings** → **Database**
- Upgrade tier if approaching limits
- Implement data archiving for old tests

### Connection Pooling
Already configured in Supabase:
- PgBouncer connection pooler
- Handles 100+ concurrent connections
- Automatic connection management

### Query Optimization
Use Prisma effectively:
```typescript
// ❌ Slow - loads all fields
const tests = await prisma.test.findMany();

// ✅ Fast - loads only needed fields
const tests = await prisma.test.findMany({
  select: { id: true, title: true, score: true },
  take: 50,
  skip: 0,
});

// ✅ Fast - uses database-side filtering
const hardTests = await prisma.test.findMany({
  where: {
    userId: 'user-123',
    completedAt: { gte: new Date('2024-01-01') }
  },
});
```

## MCP Integration Benefits

With Supabase MCP enabled, Claude Code can:

1. **Query your database directly**
   ```
   Get all tests for user 123
   Show me the most difficult questions
   ```

2. **Manage data**
   ```
   Create a new system record
   Update user progress
   ```

3. **View analytics**
   ```
   What's the average success rate?
   Show me top performers
   ```

4. **Optimize database**
   ```
   Analyze query performance
   Find slow queries
   Suggest indexes
   ```

## Next Steps

1. ✅ Get CONNECTION_STRING from Supabase Dashboard
2. ✅ Update .env.local with real values
3. ✅ Run `npx prisma migrate dev --name init`
4. ✅ Test with `npx prisma studio`
5. ⏳ (Optional) Set up MCP with `claude /mcp`
6. ⏳ Seed database with medical questions
7. ⏳ Update frontend to use API endpoints

## Helpful Commands

```bash
# View database visually
npx prisma studio

# Check migrations
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name describe_changes

# Pull schema from database (if using database-first approach)
npx prisma db pull

# Push schema to database (if using code-first approach)
npx prisma db push

# Format schema
npx prisma format

# Generate Prisma Client
npx prisma generate
```

## Resources

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Supabase Docs**: https://supabase.com/docs
- **Prisma + Supabase**: https://supabase.com/docs/guides/database/connecting-to-postgres
- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **Supabase Support**: https://supabase.com/support

## Summary

Your Supabase project is ready to use:
- ✅ PostgreSQL database provided
- ✅ SSL/TLS encryption included
- ✅ Automatic backups enabled
- ✅ Connection pooling configured
- ✅ MCP integration available

Just add your connection string to `.env.local` and run `npx prisma migrate dev --name init` to get started!
