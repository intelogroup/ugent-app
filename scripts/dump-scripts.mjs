import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '..', '.env.local') });

const BASE = 'https://www.medicospira.com/s1';

async function main() {
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

  // Go to welcome
  if (!page.url().includes('welcome')) {
    await page.goto(`${BASE}/welcome.php`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
  }

  // Click create tab
  await page.waitForSelector('#v-pills-create-tab', { timeout: 10000 });
  await page.evaluate(() => {
    document.body.classList.add('sidebar-main');
    document.querySelector('#v-pills-create-tab')?.click();
  });
  await page.waitForTimeout(2000);

  // Dump scripts
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      textContent: s.textContent?.substring(0, 500)
    }));
  });
  console.log('=== SCRIPTS ===');
  console.log(JSON.stringify(scripts, null, 2));

  await browser.close();
}

main().catch(console.error);
