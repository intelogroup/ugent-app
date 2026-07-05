import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '..', '.env.local') });

const BASE = 'https://www.medicospira.com/s1';

async function main() {
  console.log('Starting test browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto(`${BASE}/login.php`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input', { timeout: 10000 });
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    inputs[0].value = 'Jimkalinov@gmail.com';
    inputs[1].value = 'Jimkali90#';
    document.querySelector('button').click();
  });
  await page.waitForTimeout(4000);
  if (page.url().includes('paypal')) {
    await page.evaluate(() => document.querySelector('a[href*="welcome"]')?.click());
    await page.waitForTimeout(2000);
  }

  // Go to welcome if not there
  if (!page.url().includes('welcome')) {
    await page.goto(`${BASE}/welcome.php`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
  }

  // Click create tab
  await page.waitForSelector('#v-pills-create-tab', { timeout: 10000 });
  await page.evaluate(() => {
    document.body.classList.add('sidebar-main');
    document.querySelector('#v-pills-create-tab')?.click();
  });
  await page.waitForTimeout(2000);

  // Select Incorrect pool by clicking the label
  console.log('Selecting Incorrect pool...');
  await page.click('label[for="incorrectRadio"]');
  await page.waitForTimeout(1500);

  // Click select all subjects
  console.log('Clicking Select All Subjects...');
  await page.click('.selectALLSUB');
  await page.waitForTimeout(1000);

  // Click select all systems
  console.log('Clicking Select All Systems...');
  await page.click('.selectALLSYS');
  await page.waitForTimeout(2000);

  // Take screenshot to inspect the state visually
  const screenshotPath = '/Users/kalinovdameus/.gemini/antigravity/brain/28b6a9fd-a256-4a80-9f44-d2e4057bc9f3/debug_incorrect_selected.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot taken at:', screenshotPath);

  // Print available question count
  const count = await page.evaluate(() => {
    const el = document.querySelector('#num_of_ava_qus');
    return el ? el.value : 'not found';
  });
  console.log('Available questions count:', count);

  // Print checklist status
  const checkedStatus = await page.evaluate(() => {
    const subs = Array.from(document.querySelectorAll('input[name="subject[]"]')).map(el => el.checked);
    const syss = Array.from(document.querySelectorAll('input[name="System[]"]')).map(el => el.checked);
    return {
      totalSubjects: subs.length,
      checkedSubjects: subs.filter(Boolean).length,
      totalSystems: syss.length,
      checkedSystems: syss.filter(Boolean).length
    };
  });
  console.log('Checked Status:', checkedStatus);

  await browser.close();
}

main().catch(console.error);
