import { test, expect } from '@playwright/test';

test.describe('Create Test Flow', () => {
  // Use existing test user credentials
  const TEST_USER = {
    email: 'jbean@jovidoc.com',
    password: 'test123', // Update this if needed
  };

  test.beforeEach(async ({ page }) => {
    // Go to the login page
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 15000 });
  });

  test('should create a test and navigate to quiz page', async ({ page }) => {
    // Navigate to create test page
    await page.goto('/create-test');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Create New Test');

    // Select a subject (click the first available subject)
    const subjectButtons = page.locator('button:has-text("Anatomy"), button:has-text("Physiology")').first();
    await subjectButtons.click();

    // Expand a system to see topics
    const systemButton = page.locator('button:has-text("Cardiovascular System")').first();
    await systemButton.click();

    // Select a topic
    const topicButton = page.locator('button:has-text("Coronary heart disease"), button:has-text("Heart failure")').first();
    await topicButton.click();

    // Set question count to 3
    await page.fill('input[type="number"]', '3');

    // Click Create Test & Start button
    await page.click('button:has-text("Create Test & Start")');

    // Wait for redirect to quiz page
    await page.waitForURL(/\/quiz\?testId=.*/, { timeout: 15000 });

    // Verify quiz page loaded with question
    await expect(page.locator('h1')).toContainText(/Quiz Session|Tutor Test/);

    // Verify question is displayed
    const questionText = page.locator('p.text-lg').first();
    await expect(questionText).toBeVisible();

    // Verify answer options are displayed
    const answerOptions = page.locator('button:has-text("A."), button:has-text("B."), button:has-text("C.")');
    await expect(answerOptions.first()).toBeVisible();

    console.log('✅ Test created successfully and quiz page loaded');
  });

  test('should allow answering questions and show feedback', async ({ page }) => {
    // Navigate to create test page
    await page.goto('/create-test');
    await page.waitForLoadState('networkidle');

    // Quick test creation
    await page.locator('button:has-text("Anatomy")').first().click();
    await page.locator('button:has-text("Cardiovascular System")').first().click();
    await page.locator('button:has-text("Coronary heart disease"), button:has-text("Heart failure")').first().click();
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Create Test & Start")');

    // Wait for quiz page
    await page.waitForURL(/\/quiz\?testId=.*/, { timeout: 15000 });

    // Select an answer (first option)
    const firstOption = page.locator('button').filter({ hasText: /^A\./ }).first();
    await firstOption.click();

    // Submit the answer
    await page.click('button:has-text("Submit Answer")');

    // Wait for feedback (either Correct or Incorrect)
    await page.waitForSelector('text=/Correct|Incorrect/', { timeout: 5000 });

    // Verify feedback is shown
    const feedback = page.locator('div:has-text("Correct"), div:has-text("Incorrect")').first();
    await expect(feedback).toBeVisible();

    // Verify Next Question button appears
    const nextButton = page.locator('button:has-text("Next Question")');
    await expect(nextButton).toBeVisible();

    console.log('✅ Answer submitted and feedback displayed');
  });

  test('should track progress through multiple questions', async ({ page }) => {
    // Navigate to create test page
    await page.goto('/create-test');
    await page.waitForLoadState('networkidle');

    // Create test with 3 questions
    await page.locator('button:has-text("Anatomy")').first().click();
    await page.locator('button:has-text("Cardiovascular System")').first().click();
    await page.locator('button:has-text("Coronary heart disease"), button:has-text("Heart failure")').first().click();
    await page.fill('input[type="number"]', '3');
    await page.click('button:has-text("Create Test & Start")');

    // Wait for quiz page
    await page.waitForURL(/\/quiz\?testId=.*/, { timeout: 15000 });

    // Answer first question
    await page.locator('button').filter({ hasText: /^A\./ }).first().click();
    await page.click('button:has-text("Submit Answer")');
    await page.waitForSelector('text=/Correct|Incorrect/', { timeout: 5000 });

    // Verify progress shows 1 of 3
    await expect(page.locator('text=/Question 1 of 3/')).toBeVisible();

    // Go to next question
    await page.click('button:has-text("Next Question")');

    // Verify progress shows 2 of 3
    await expect(page.locator('text=/Question 2 of 3/')).toBeVisible();

    // Answer second question
    await page.locator('button').filter({ hasText: /^B\./ }).first().click();
    await page.click('button:has-text("Submit Answer")');
    await page.waitForSelector('text=/Correct|Incorrect/', { timeout: 5000 });

    // Go to next question
    await page.click('button:has-text("Next Question")');

    // Verify progress shows 3 of 3
    await expect(page.locator('text=/Question 3 of 3/')).toBeVisible();

    console.log('✅ Progress tracking works correctly');
  });
});
