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
| `app/auth/verify-email/page.tsx` | Static "Check your inbox" page shown after sign-up |

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
  → workos.userManagement.createUser({ email, password, emailVerified: false })
  → WorkOS sends verification email automatically
  → redirect('/auth/verify-email?pending=true')  [inform user to check inbox]

  [User clicks WorkOS verification link in email]
  → WorkOS redirects to /callback → handleAuth() sets session → redirect('/dashboard')
```

**Note:** WorkOS requires email verification for new password accounts by default. Rather than bypassing this (which would require `emailVerified: true` and is a security risk), the sign-up flow hands off to WorkOS's email verification. The verify page shows a "Check your inbox" message.

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

**Session cookie:** `@workos-inc/authkit-nextjs` exports `saveSession()` specifically for custom auth flows:
```ts
import { saveSession } from '@workos-inc/authkit-nextjs';

// authResponse = result of authenticateWithPassword() or authenticateWithMagicAuth()
await saveSession(authResponse, process.env.NEXT_PUBLIC_APP_URL!);
redirect('/dashboard');
```
`saveSession` accepts an `AuthenticationResponse` directly, encrypts it, and sets the `wos-session` cookie. After `redirect()`, the middleware reads the cookie on the next request, sets the `x-workos-session` header, and `withAuth()` in dashboard works correctly.

**CSRF protection:** Next.js App Router Server Actions include built-in CSRF protection via `Origin` header validation — the browser cannot forge a cross-origin Server Action call. No additional CSRF token needed.

**Email in verify URL (magic code):** Use a dedicated `WORKOS_MAGIC_CODE_HMAC_SECRET` env var (separate from `WORKOS_COOKIE_PASSWORD` to avoid coupling). Sign `<timestamp>.<email>` with HMAC-SHA256, encode as `base64url`. URL format: `/auth/verify?token=<base64url-payload>`. Expiry: 10 minutes. Server Action decodes, verifies HMAC, checks expiry, extracts email.

---

## Error Handling

### WorkOS Errors → User Messages

| WorkOS error | Flow | User-facing message |
|---|---|---|
| `invalid_credentials` | Sign in | "Invalid email or password" |
| `invalid_credentials` / `email_not_found` | Sign in | "Invalid email or password" (do NOT distinguish — prevents email enumeration) |
| `password_too_weak` | Sign up | "Password must be at least 8 characters" |
| `user_already_exists` | Sign up | "An account with this email already exists" *(see note below)* |
| `email_not_verified` | Sign in | "Please verify your email first — check your inbox, or use the link below to sign in another way" |
| `invalid_or_expired_code` | Magic code verify | "Code is incorrect or expired — request a new one" |
| WorkOS rate limit | `sendMagicCode` | "Too many attempts — please wait a moment and try again" |
| `email_not_found` | `sendMagicCode` | "If that email is registered, you'll receive a code shortly" *(no enumeration)* |
| Any other error | All | "Something went wrong, please try again" |

**Email enumeration — password sign-in:** `email_not_found` and `invalid_credentials` both return the same message to prevent account enumeration.

**`user_already_exists` on sign-up:** Showing "email already exists" is a minor enumeration vector. Accepted as an intentional UX trade-off — users need to know to sign in instead. The alternative (silent re-send of a verification email) adds significant complexity for minimal security gain in this app's threat model.

**`email_not_verified` on sign-in:** The "sign in another way" link in the error message points to the WorkOS hosted UI fallback — this covers the resend-verification use case without requiring a custom resend flow.

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

1. **`@workos-inc/node`** minimum version: `^0.30.0` (requires `userManagement.authenticateWithPassword`, `authenticateWithMagicAuth`, `sendMagicAuthCode`, `createUser`). Check installed version before implementing.
2. **Session cookie writing** — Before implementing Server Actions, read `node_modules/@workos-inc/authkit-nextjs/src/session.ts` to find the exact session-writing API. If no public `setSession`/`updateSession` is exported, manually seal the cookie using `@hapi/iron` (already a transitive dep of `authkit-nextjs`). This is the highest-risk implementation detail — verify it works end-to-end with `withAuth()` before building the rest.
3. **`WORKOS_CLIENT_ID`** must be present as an env var server-side for `authenticateWithPassword` and `authenticateWithMagicAuth`.
4. **`WORKOS_COOKIE_PASSWORD`** must be present server-side for session cookie sealing (used by `saveSession` internally).
5. **`WORKOS_MAGIC_CODE_HMAC_SECRET`** — new env var required; add to `.env.local` and Vercel env config before deploying.
6. **`NEXT_PUBLIC_APP_URL`** — required as the `request` URL argument to `saveSession()`. Set to `https://yourdomain.com` in production, `http://localhost:3000` in dev.
7. Keep the existing WorkOS hosted-UI redirect as a fallback link ("Sign in another way") on the login page for edge cases and email verification resend.
8. **Rate limiting:** WorkOS applies server-side rate limiting on `sendMagicAuthCode` and `authenticateWithPassword`. No additional middleware rate limiting required for MVP.
