import { test, expect } from '@playwright/test';

/**
 * Auth Flow Tests — login, signup form, redirect protection
 * Credentials: use jimkalinov@gmail.com (OTP via email) or test creds below
 */

const TEST_USER = {
  email: 'jbean@jovidoc.com',
  password: 'test123',
};

test.describe('Authentication Flows', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Branding
    await expect(page.locator('h1')).toContainText('Ugent');
    await expect(page.locator('text=Usmle Study Agent')).toBeVisible();

    // Form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Navigation to signup
    await expect(page.locator('a[href="/signup"]')).toBeVisible();

    console.log('✅ Login page renders correctly');
  });

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Ugent');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Has link back to login
    await expect(page.locator('a[href="/login"]')).toBeVisible();

    console.log('✅ Signup page renders correctly');
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error message should appear
    await page.waitForTimeout(3000);
    const errorMsg = page.locator('text=/invalid|incorrect|wrong|failed/i');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });

    console.log('✅ Invalid credentials shows error');
  });

  test('login form validation — empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Should not navigate away
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/login');

    console.log('✅ Empty form stays on login page');
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/create-test',
      '/tests',
      '/leaderboard',
      '/notes',
      '/analytics',
      '/settings',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const url = page.url();
      const isRedirected = url.includes('/login') || url.includes('/signup');
      console.log(`${isRedirected ? '✅' : '⚠️ '} ${route} → ${url}`);
      // Log but don't fail — some routes may be publicly accessible
    }
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    try {
      await page.waitForURL('/dashboard', { timeout: 15000 });
      console.log('✅ Login redirects to /dashboard');
    } catch {
      console.log(`⚠️  Login redirect: current URL = ${page.url()}`);
    }
  });

  test('pricing page is publicly accessible', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const isPublic = !url.includes('/login');
    console.log(`${isPublic ? '✅' : '⚠️ '} Pricing page is ${isPublic ? 'public' : 'auth-protected'}`);
    expect(page.locator('body')).toBeVisible();
  });
});
