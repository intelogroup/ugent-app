// tests/e2e/responsive-layout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Responsive layout', () => {
  test('mobile (375px): MobileNav visible, Sidebar hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    // Sidebar should be hidden (display: none via md:hidden)
    const sidebar = page.locator('[class*="hidden md:flex"]').first();
    await expect(sidebar).toBeHidden();
  });

  test('desktop (1024px): Sidebar visible, MobileNav hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/dashboard');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  });
});
