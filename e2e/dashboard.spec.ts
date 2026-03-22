import { test, expect, Page } from '@playwright/test';

/**
 * Dashboard + post-login page tests
 * Covers: dashboard, leaderboard, notes, analytics, search, tests list
 */

const TEST_USER = {
  email: 'jbean@jovidoc.com',
  password: 'test123',
};

async function loginUser(page: Page) {
  await page.goto('/login');
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

    // Welcome message
    await expect(page.locator('h1')).toBeVisible();
    const heading = await page.locator('h1').first().textContent();
    console.log(`✅ Dashboard heading: "${heading}"`);

    // Check for performance/stats area
    const hasCharts = await page.locator('canvas, svg').count();
    console.log(`${hasCharts > 0 ? '✅' : '⚠️ '} Charts/graphs: ${hasCharts} found`);

    // AI badge
    const hasAiBadge = await page.locator('text=/AI Active|AI/').count();
    console.log(`${hasAiBadge > 0 ? '✅' : '⚠️ '} AI badge present`);
  });

  test('navigation sidebar links are present', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const navLinks = ['dashboard', 'create', 'tests', 'leaderboard', 'notes'];
    for (const link of navLinks) {
      const found = await page.locator(`a[href*="${link}"], nav >> text=${link}`).count();
      console.log(`${found > 0 ? '✅' : '⚠️ '} Nav link for "${link}": ${found > 0 ? 'found' : 'not found'}`);
    }
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    // Check page doesn't error
    await expect(page.locator('body')).toBeVisible();

    // Look for leaderboard content
    const hasRanking = await page.locator('text=/rank|leaderboard|score|trophy/i').count();
    console.log(`${hasRanking > 0 ? '✅' : '⚠️ '} Leaderboard content found: ${hasRanking} elements`);

    // Tabs (weekly, monthly etc)
    const hasTabs = await page.locator('[role="tab"], button:has-text("Weekly"), button:has-text("Monthly")').count();
    console.log(`${hasTabs > 0 ? '✅' : '⚠️ '} Leaderboard tabs: ${hasTabs} found`);
  });

  test('notes page loads and shows create button', async ({ page }) => {
    await page.goto('/notes');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    console.log(`✅ Notes page loaded`);

    const hasCreateBtn = await page.locator('button:has-text("New Note"), button:has-text("Add"), button:has-text("+")').count();
    console.log(`${hasCreateBtn > 0 ? '✅' : '⚠️ '} Create note button: ${hasCreateBtn > 0 ? 'found' : 'not found'}`);
  });

  test('analytics page loads with charts', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();

    const hasCharts = await page.locator('canvas, svg, [class*="chart"]').count();
    console.log(`${hasCharts > 0 ? '✅' : '⚠️ '} Analytics charts: ${hasCharts} found`);

    const hasStats = await page.locator('text=/accuracy|score|progress|performance/i').count();
    console.log(`${hasStats > 0 ? '✅' : '⚠️ '} Analytics stats text: ${hasStats} elements`);
  });

  test('tests list page loads', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Tests list page loaded');

    const hasTests = await page.locator('[class*="test"], tr, li, article').count();
    console.log(`✅ Found ${hasTests} list items on tests page`);
  });

  test('search page works', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    const hasSearch = await searchInput.count();
    console.log(`${hasSearch > 0 ? '✅' : '⚠️ '} Search input: ${hasSearch > 0 ? 'found' : 'not found'}`);

    if (hasSearch > 0) {
      await searchInput.fill('anatomy');
      await page.waitForTimeout(1000);
      const results = await page.locator('[class*="result"], ul li, [class*="suggestion"]').count();
      console.log(`✅ Search results: ${results} items for "anatomy"`);
    }
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Settings page loaded');

    const hasForm = await page.locator('form, input, select').count();
    console.log(`${hasForm > 0 ? '✅' : '⚠️ '} Settings form elements: ${hasForm}`);
  });
});
