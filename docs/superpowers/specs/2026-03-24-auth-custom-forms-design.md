# Auth Custom Forms Design

**Date:** 2026-03-24
**Status:** Approved
**Stack:** Next.js 16 App Router, WorkOS AuthKit, Convex

---

## Problem

The current login and signup pages each render a single button that redirects to WorkOS's hosted auth UI. This causes a CORS error on `send-verification-otp` (a client-side call missing `Access-Control-Allow-Origin`). The desired UX is inline forms — no redirect to an external hosted UI.

---

## Goals

1. Fix the CORS error by moving all WorkOS API calls server-side.
2. Add an inline **email + password** form on login and signup pages.
3. Add an inline **magic code** (passwordless) flow: enter email → receive 6-digit code → enter code.

---

## Out of Scope

- Social OAuth (Google, GitHub) — not requested.
- SMS / phone auth.
- Changes to middleware, callback route, or Convex auth integration.

---

## Architecture

### Files Modified

| File | Change |
|------|--------|
| `app/login/page.tsx` | Replace single-button server component with client component: two tabs (Email+Password / Magic Code) |
| `app/signup/page.tsx` | Replace single-button server component with client component: email+password form |

### Files Created

| File | Purpose |
|------|---------|
| `app/actions/auth.ts` | All Server Actions: `signIn`, `signUp`, `sendMagicCode`, `verifyMagicCode` |
| `app/auth/verify/page.tsx` | Step 2 of magic code flow: enter 6-digit code |

### Files Unchanged

- `app/callback/route.ts` — still handles WorkOS OAuth redirect fallback
- `middleware.ts` — no changes; `withAuth()` still reads the same session cookie
- All Convex files — auth integration unchanged

---

## Data Flow

### Email + Password Sign In

```
User submits form
  → signIn(email, password) [Server Action]
  → workos.userManagement.authenticateWithPassword({ email, password, clientId })
  → WorkOS returns { user, accessToken, refreshToken }
  → Set session cookie via authkit-nextjs session utilities
  → redirect('/dashboard')
```

### Email + Password Sign Up

```
User submits form
  → signUp(email, password) [Server Action]
  → workos.userManagement.createUser({ email, password })
  → workos.userManagement.authenticateWithPassword({ email, password, clientId })
  → Set session cookie
  → redirect('/dashboard')
```

### Magic Code (Passwordless)

```
Step 1 — Request code:
  User enters email → sendMagicCode(email) [Server Action]
  → workos.userManagement.sendMagicAuthCode({ email })
  → redirect('/auth/verify?email=<encrypted>')

Step 2 — Verify code:
  User enters 6-digit code → verifyMagicCode(email, code) [Server Action]
  → workos.userManagement.authenticateWithMagicAuth({ email, code, clientId })
  → Set session cookie
  → redirect('/dashboard')
```

**Session cookie:** After any successful auth, use `authkit-nextjs` session utilities (e.g. `encryptSession` or equivalent) to write the same signed `wos-session` cookie that `withAuth()` and middleware already read. No session infrastructure changes needed.

**Email in verify URL:** Encrypt or sign the email parameter passed to `/auth/verify` to prevent tampering. Use a short-lived HMAC or encrypt with `WORKOS_COOKIE_PASSWORD`.

---

## Error Handling

### WorkOS Errors → User Messages

| WorkOS error | User-facing message |
|---|---|
| `invalid_credentials` | "Invalid email or password" |
| `email_not_found` | "No account found with that email" |
| `password_too_weak` | "Password must be at least 8 characters" |
| `user_already_exists` | "An account with this email already exists" |
| `invalid_or_expired_code` | "Code is incorrect or expired — request a new one" |
| Any other error | "Something went wrong, please try again" |

### Client-Side Validation (before submit)

- Email: valid format (HTML `type="email"` + pattern check)
- Password (signup): min 8 characters
- Code: exactly 6 digits (`/^\d{6}$/`)

### UX

- Errors render inline below the relevant field or as a banner above the submit button.
- User stays on the form on error — no page redirect.
- Submit button shows loading state during pending action.

---

## CORS Fix

The root cause: a client-side call to a custom endpoint (or direct WorkOS API) was missing `Access-Control-Allow-Origin`.

**Fix:** All WorkOS API calls move into Server Actions (`'use server'`). Server Actions execute on the server — no cross-origin request is made from the browser to WorkOS. The CORS error is eliminated structurally, not patched.

---

## Testing

### Existing Tests to Update

| File | Update |
|------|--------|
| `__tests__/auth/otp.test.ts` | Update to match `sendMagicCode` / `verifyMagicCode` Server Action signatures |
| `__tests__/auth/email-password.test.ts` | Update to test `signIn` / `signUp` Server Actions |
| `__tests__/auth/magic-link.test.ts` | Update to test magic code flow |
| `e2e/auth.spec.ts` | Minor selector updates — password inputs now exist natively |

### New Unit Tests

- Error paths: wrong password, expired code, user already exists, network failure
- Redirect behavior after successful auth for each flow

---

## Implementation Notes

1. **`@workos-inc/node`** must be installed if not already present (check before implementing).
2. **Session cookie writing** — verify exact `authkit-nextjs` export for setting session from tokens before writing Server Actions. This is the highest-risk implementation detail.
3. **`WORKOS_CLIENT_ID`** must be available as an env var server-side for `authenticateWithPassword` and `authenticateWithMagicAuth` calls.
4. Keep the existing WorkOS hosted-UI redirect as a fallback link ("Sign in another way") on the login page for edge cases.
