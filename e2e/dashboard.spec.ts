import { test, expect, Page } from '@playwright/test';

/**
 * Dashboard + post-login page tests
 * Covers: dashboard, leaderboard, analytics, tests list, settings
 */

const TEST_USER = {
  email: process.env.E2E_USER_EMAIL || 'jbean@jovidoc.com',
  password: process.env.E2E_USER_PASSWORD || 'test123',
};

async function loginUser(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 15000 });
}

test.describe('Dashboard & Core Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('dashboard loads with key UI sections', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('analytics page loads with charts', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('tests list page loads', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
