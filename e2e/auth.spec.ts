import { test, expect } from '@playwright/test';

/**
 * Auth Flow Tests — login, signup form, redirect protection
 */

const TEST_USER = {
  email: 'jbean@jovidoc.com',
  password: 'test123',
};

test.describe('Authentication Flows', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/auth/signup"]')).toBeVisible();
  });

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('text=/invalid|incorrect|wrong|failed/i');
    await expect(errorMsg).toBeVisible({ timeout: 8000 });
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/create-test', '/tests', '/leaderboard', '/analytics', '/settings'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/auth/login');
    }
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard', { timeout: 15000 });
  });
});
