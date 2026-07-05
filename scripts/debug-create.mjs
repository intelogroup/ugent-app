import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '..', '.env.local') });

const BASE = 'https://www.medicospira.com/s1';

async function main() {
  console.log('Starting debug browser...');
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
  await page.waitForTimeout(3000);
  if (page.url().includes('paypal')) {
    await page.evaluate(() => document.querySelector('a[href*="welcome"]')?.click());
    await page.waitForTimeout(2000);
  }
  console.log('Logged in. URL:', page.url());
  const artifactDir = '/Users/kalinovdameus/.gemini/antigravity/brain/28b6a9fd-a256-4a80-9f44-d2e4057bc9f3';
  await page.screenshot({ path: `${artifactDir}/debug_1_login.png` });

  // Go to welcome if not there
  if (!page.url().includes('welcome')) {
    console.log('Navigating to welcome.php...');
    await page.goto(`${BASE}/welcome.php`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
  }
  console.log('At welcome.php. URL:', page.url());
  await page.screenshot({ path: `${artifactDir}/debug_2_welcome.png` });

  // Click create tab
  console.log('Clicking create tab...');
  await page.waitForSelector('#v-pills-create-tab', { timeout: 10000 });
  await page.evaluate(() => {
    document.body.classList.add('sidebar-main');
    document.querySelector('#v-pills-create-tab')?.click();
  });
  await page.waitForTimeout(2000);
  console.log('After create tab click. URL:', page.url());
  await page.screenshot({ path: `${artifactDir}/debug_3_create_tab.png` });

  // Select Incorrect pool
  console.log('Selecting Incorrect pool...');
  await page.evaluate(() => {
    const radio = document.querySelector('#incorrectRadio');
    if (radio) {
      radio.click();
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1000);

  // Check subjects
  console.log('Checking subjects...');
  await page.evaluate(() => {
    document.querySelectorAll('input[name="subject[]"]').forEach(el => { if (!el.checked) el.click(); });
  });
  await page.waitForTimeout(1000);

  // Check systems
  console.log('Checking systems...');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('input[name="System[]"]'))
      .filter(el => !el.disabled)
      .forEach(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  });
  await page.waitForTimeout(2000);

  // Dump HTML of create test container
  const html = await page.evaluate(() => {
    const el = document.querySelector('#v-pills-create');
    return el ? el.outerHTML : 'Not found';
  });
  writeFileSync(`${artifactDir}/create_page.html`, html);
  console.log('HTML dumped to create_page.html');

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
});

