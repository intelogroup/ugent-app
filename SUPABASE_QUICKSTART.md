# Supabase Quick Start - 3 Minutes

Your Supabase project is already created. Follow these 3 steps to connect your app.

## Step 1: Get Connection String (1 minute)

1. Open https://supabase.com/dashboard
2. Select your project (yxuzslfctaattbcquamt)
3. Go: **Settings** → **Database**
4. Under "Connection string", select **"Prisma"**
5. **Copy the entire connection string**

It looks like:
```
postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?schema=public&sslmode=require
```

## Step 2: Update Environment (1 minute)

Edit `.env.local` and replace this line:

```env
DATABASE_URL="[PASTE_YOUR_CONNECTION_STRING_HERE]"
```

With the string you copied above.

Example:
```env
DATABASE_URL="postgresql://postgres.yxuzslfctaattbcquamt:abc123xyz@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public&sslmode=require"
```

## Step 3: Initialize Database (1 minute)

```bash
cd /Users/kalinovdameus/Developer/Ugent/ugent-app

# Initialize database with your schema
npx prisma migrate dev --name init
```

Done! Your database is ready.

## Verify It Works

```bash
# Open visual database editor
npx prisma studio

# Opens http://localhost:5555 - you can see all your tables
```

## Optional: Set Up MCP (For Claude Code Integration)

```bash
# Add MCP server
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=yxuzslfctaattbcquamt"

# Authenticate
claude /mcp
# Select "supabase" and "Authenticate"
```

## That's It!

Your data-heavy backend is now connected to Supabase:
- ✅ PostgreSQL database (managed)
- ✅ All your schemas ready
- ✅ User interaction tracking enabled
- ✅ API routes connected
- ✅ Ready for production

For more details, see `SUPABASE_SETUP.md`
