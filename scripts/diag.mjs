import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// ── Login ──
await page.goto('https://www.medicospira.com/uworld1/login.php', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('input', { timeout: 10000 });
await page.evaluate(() => {
  const inputs = document.querySelectorAll('input');
  inputs[0].value = 'Jimkalinov@gmail.com';
  inputs[1].value = 'Jimkali90#';
  document.querySelector('button').click();
});
await page.waitForTimeout(4000);
console.log('After login URL:', page.url().substring(0, 80));

// Handle paypal redirect
if (page.url().includes('paypal')) {
  await page.evaluate(() => document.querySelector('a[href*="welcome"]')?.click());
  await page.waitForTimeout(3000);
}
console.log('After paypal URL:', page.url().substring(0, 80));

// ── Create Test ──
await page.evaluate(() => {
  document.body.classList.add('sidebar-main');
  document.querySelector('#v-pills-create-tab')?.click();
});
await page.waitForTimeout(1000);

await page.evaluate(() => {
  document.querySelectorAll('input[name="subject[]"]').forEach(el => { if (!el.checked) el.click(); });
});
await page.waitForTimeout(1000);

await page.evaluate(() => {
  Array.from(document.querySelectorAll('input[name="System[]"]'))
    .filter(el => !el.disabled)
    .forEach(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  const num = document.querySelector('#number_qbox');
  num.value = '5';
  num.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.evaluate(() => document.querySelector('#create_test_btn')?.click());
await page.waitForTimeout(5000);
const eId = page.url().match(/e_id=(\d+)/)?.[1];
console.log('Created test e_id:', eId);
if (!eId) { console.log('FAILED to create test, URL:', page.url()); process.exit(1); }

// ── Load Exam ──
await page.goto(`https://www.medicospira.com/uworld1/resum_rout.php?id=${eId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
console.log('Exam URL:', page.url().substring(0, 80));

// ── Define extractor ──
await page.evaluate(() => {
  window.__extract = function() {
    const panel = document.querySelector('[role="tabpanel"]') || document.body;
    const paras = Array.from(panel.querySelectorAll('p')).map(p => p.innerText.trim()).filter(t => t.length > 10);
    const choices = Array.from(panel.querySelectorAll('input[type=radio]')).map(r => {
      const sib = r.nextElementSibling; return sib ? sib.innerText.trim() : '';
    }).filter(t => t.length > 0);
    const fullText = document.body.innerText;
    const expIdx = fullText.indexOf('Explanation\n');
    const expText = expIdx >= 0 ? fullText.slice(expIdx + 'Explanation\n'.length, expIdx + 2000).trim() : '';
    const correctIdx = fullText.indexOf('Correct Answer');
    const correct = correctIdx >= 0 ? fullText.slice(correctIdx, correctIdx + 20).replace('Correct Answer ','').split('\n')[0].trim() : '';
    return `${paras.join('\n\n')}\n\n${choices.join('\n')}\nCorrect Answer: ${correct}\n\nExplanation:\n${expText}`;
  };
});

// ── Answer Q1, then dump elements ──
await page.evaluate(() => {
  const radios = document.querySelectorAll('input[type=radio]');
  if (radios.length > 0) radios[0].click();
  const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit');
  if (submitBtn) submitBtn.click();
});
await page.waitForTimeout(2500);
console.log('\n=== DUMPING ALL CLICKABLE ELEMENTS AFTER Q1 SUBMIT ===\n');

const elements = await page.evaluate(() => {
  const results = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const tag = el.tagName;
    const isClickable = style.cursor === 'pointer' || el.onclick || tag === 'BUTTON' || tag === 'A' || tag === 'I' || el.hasAttribute('onclick');
    if (!isClickable) continue;
    const text = (el.innerText || el.textContent || '').trim().substring(0, 80);
    const cls = typeof el.className === 'string' ? el.className : (el.getAttribute?.('class') || '').toString();
    results.push({
      tag,
      text,
      id: el.id || '',
      class: cls.substring(0, 80),
      innerHTML: (el.innerHTML || '').substring(0, 140),
      aria: el.getAttribute('aria-label') || '',
      title: el.title || '',
      rect: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
    });
  }
  return results;
});

// Show elements that look like navigation
const nav = elements.filter(e =>
  e.text.toLowerCase().includes('next') ||
  e.class?.toLowerCase().includes('next') ||
  e.class?.toLowerCase().includes('arrow') ||
  e.class?.toLowerCase().includes('chevron') ||
  e.id?.toLowerCase().includes('next') ||
  e.aria?.toLowerCase().includes('next') ||
  e.innerHTML?.includes('chevron') ||
  e.innerHTML?.includes('arrow') ||
  e.innerHTMLL?.includes('fa-arrow') ||
  e.text === '>' || e.text.includes('arrow') ||
  e.innerHTML?.includes('next')
);
console.log('=== NEXT-RELATED ELEMENTS ===');
nav.forEach(e => console.log(JSON.stringify(e, null, 2)));

// Also dump ALL elements in case nothing stands out
console.log('\n=== ALL CLICKABLE ELEMENTS ===');
elements.forEach(e => {
  console.log(`${e.tag}#${e.id} .${e.class?.substring(0,30)} | "${e.text}" | ${e.rect}`);
});

console.log('\nBrowser stays open. Ctrl+C to exit.');
await new Promise(() => {});
