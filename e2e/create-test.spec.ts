import { test, expect } from '@playwright/test';

test.describe('Create Test Flow', () => {
  const TEST_USER = {
    email: process.env.E2E_USER_EMAIL || 'jbean@jovidoc.com',
    password: process.env.E2E_USER_PASSWORD || 'test123', // Update this if needed
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 15000 });
  });

  test('builds a test and navigates to the quiz page', async ({ page }) => {
    await page.goto('/create-test');
    await page.waitForLoadState('networkidle');

    // Page loaded with the bank total
    await expect(page.locator('h1')).toContainText('Build a test');

    // Select a single subject so the filter becomes a subject param
    const subjectButtons = page.locator('button:has-text("Anatomy")').first();
    await expect(subjectButtons).toBeVisible({ timeout: 10000 });
    await subjectButtons.click();

    // Set question count to 3
    await page.fill('input[type="number"]', '3');

    // Start the test — create-test navigates to /quiz?subject=...&limit=...
    await page.click('button:has-text("3-question test")');

    await page.waitForURL(/\/quiz\?.*subject=.*/, { timeout: 15000 });

    // Quiz page shows a question and options
    await expect(page.locator('text=/Question 1 of 3/')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Submit Answer")')).toBeVisible();
  });

  test('answers a question and gets feedback', async ({ page }) => {
    await page.goto('/create-test');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Anatomy")').first().click();
    await page.fill('input[type="number"]', '1');
    await page.click('button:has-text("1-question test")');

    await page.waitForURL(/\/quiz\?.*subject=.*/, { timeout: 15000 });
    await expect(page.locator('text=/Question 1 of 1/')).toBeVisible({ timeout: 10000 });

    // Pick the first option (letter chip A/B/C...) and submit
    const options = page.locator('div.flex.items-center.gap-3');
    await expect(options.first()).toBeVisible();
    await options.first().click();
    await page.click('button:has-text("Submit Answer")');

    // Feedback appears (Correct! or Incorrect), plus Next/Complete button
    await page.waitForSelector('text=/Correct!|Incorrect/', { timeout: 10000 });
    await expect(page.locator('button:has-text("Complete Quiz"), button:has-text("Next Question")').first()).toBeVisible();
  });
});
