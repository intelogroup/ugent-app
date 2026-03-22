# Restore Environment & Fix 500s Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the missing `.env.local` file so all routes stop returning 500 and login/auth works again.

**Architecture:** The app is Next.js + Supabase (email/password auth) + Prisma + Stripe. Every request passes through `middleware.ts → lib/supabase/middleware.ts` which calls `createServerClient(NEXT_PUBLIC_SUPABASE_URL!, NEXT_PUBLIC_SUPABASE_ANON_KEY!)`. With no `.env.local`, both values are `undefined`, causing a crash on every single route — hence the universal 500s.

**Tech Stack:** Next.js 15, Supabase SSR (`@supabase/ssr`), Prisma, Stripe

---

## Root Cause

```
No .env.local  →  NEXT_PUBLIC_SUPABASE_URL = undefined
               →  middleware crashes on every request
               →  500 on all routes
```

The login page uses `supabase.auth.signInWithPassword()` — email + password, not OTP. Once env vars are restored, login will work normally.

---

## Required Environment Variables

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project → Settings → API → anon public key |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → signing secret |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` | Stripe Dashboard → Products → monthly price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL` | Stripe Dashboard → Products → annual price ID |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

---

## File Structure

- **Create:** `.env.local` — all environment variables for local dev
- **Verify (no changes):** `lib/supabase/middleware.ts` — already correct
- **Verify (no changes):** `middleware.ts` — already correct

---

## Task 1: Create `.env.local`

**Files:**
- Create: `.env.local`

- [ ] **Step 1: Get Supabase credentials**

  Go to [supabase.com/dashboard](https://supabase.com/dashboard) → select the ugent project → Settings → API.
  Copy:
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 2: Create `.env.local`**

  Create `/Users/kalinovdameus/Developer/ugent-app/.env.local`:

  ```env
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

  # App
  NEXT_PUBLIC_APP_URL=http://localhost:3000

  # Stripe (fill in later if not testing payments)
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_...
  NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL=price_...
  ```

- [ ] **Step 3: Verify `.env.local` is gitignored**

  ```bash
  grep ".env.local" /Users/kalinovdameus/Developer/ugent-app/.gitignore
  ```
  Expected: `.env.local` appears in output. If not, add it.

---

## Task 2: Verify Dev Server Recovers

**Files:** none (verification only)

- [ ] **Step 1: Restart dev server**

  Kill any running dev server, then:
  ```bash
  cd /Users/kalinovdameus/Developer/ugent-app
  npm run dev
  ```

- [ ] **Step 2: Check homepage loads (no 500)**

  Open `http://localhost:3000` — should load the landing page without error.

- [ ] **Step 3: Check login page loads**

  Open `http://localhost:3000/login` — should show the email/password form.

- [ ] **Step 4: Verify protected routes redirect properly**

  Open `http://localhost:3000/dashboard` — should redirect to `/login` (not 500).

- [ ] **Step 5: Test login**

  Enter a valid Supabase email+password account. Should redirect to `/dashboard` on success.

  If you don't have an account: go to Supabase Dashboard → Authentication → Users → Add user.

---

## Task 3: Check Prisma Connection (if dashboard still errors)

**Files:** none (diagnostic only)

- [ ] **Step 1: Check if DATABASE_URL is needed**

  ```bash
  grep -r "DATABASE_URL\|prisma" /Users/kalinovdameus/Developer/ugent-app/app --include="*.ts" --include="*.tsx" -l
  ```

  If any files import from `@/lib/prisma` or similar, Prisma needs `DATABASE_URL` in `.env.local`:

  ```env
  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
  ```

  Get from: Supabase Dashboard → Settings → Database → Connection string (URI mode).

- [ ] **Step 2: Test Prisma connection (if needed)**

  ```bash
  cd /Users/kalinovdameus/Developer/ugent-app
  npx prisma db pull
  ```

  Expected: connects without error.

---

## Task 4: Stripe Webhooks (only needed if testing payments locally)

- [ ] **Step 1: Install Stripe CLI (if not installed)**

  ```bash
  brew install stripe/stripe-cli/stripe
  stripe login
  ```

- [ ] **Step 2: Forward webhooks to local server**

  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```

  Copy the `whsec_...` signing secret output → paste into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

---

## Quick Checklist — Minimum to Unblock Dev

The minimum to stop 500s and get login working:

```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Stripe vars can be left as placeholder strings (`sk_test_placeholder`) if you're not testing payments — the middleware and auth don't touch Stripe.
