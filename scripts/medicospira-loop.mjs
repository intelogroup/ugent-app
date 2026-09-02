import { chromium } from 'playwright';
import { writeFileSync, appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '..', '.env.local') });
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'medicospira-questions.jsonl');

const BASE = 'https://usmle.medicospira.com/s1';
const API_BASE = 'https://api.medicospira.com/api/v1/api';

const EMAIL = 'Jimkalinov@gmail.com';
const PASSWORD = 'Jimkali90#';

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function textHash(text) {
  return createHash('md5').update(normalizeText(text)).digest('hex').slice(0, 8);
}

function loadQuestions() {
  try {
    if (!existsSync(QUESTIONS_FILE)) return [];
    const content = readFileSync(QUESTIONS_FILE, 'utf8');
    return content.trim().split('\n').filter(Boolean).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(q => q && q.text);
  } catch { return []; }
}

function isDuplicate(text, existing) {
  const h = textHash(text);
  return existing.some(q => q.textHash === h);
}

function parseChoicesFromDOM(pageText) {
  const choices = [];
  const lines = pageText.split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-F])\)\s*(.+)/);
    if (m) choices.push({ letter: m[1], text: m[2].trim() });
  }
  return choices;
}

function extractExplanationFromDOM(fullText) {
  const expIdx = fullText.indexOf('Explanation');
  const eduIdx = fullText.indexOf('Educational objective:');
  let explanation = '';
  let educationalObjective = '';

  if (expIdx >= 0) {
    const endIdx = eduIdx > expIdx ? eduIdx : expIdx + 8000;
    explanation = fullText.slice(expIdx + 'Explanation'.length, endIdx).trim();
  }
  if (eduIdx >= 0) {
    const endIdx = fullText.indexOf('Block Time Elapsed:', eduIdx);
    educationalObjective = fullText.slice(eduIdx + 'Educational objective:'.length, endIdx > eduIdx ? endIdx : undefined).trim();
  }

  return { explanation, educationalObjective };
}

let lastLoginTime = 0;

async function login(page) {
  lastLoginTime = Date.now();
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input', { timeout: 10000 });

  // Fill email and password - try various selectors
  const emailInput = await page.$('input[type="email"], input[name="email"], input[autocomplete="email"], input[placeholder*="email" i]');
  if (emailInput) {
    await emailInput.fill(EMAIL);
  } else {
    // Fallback: fill first visible text input
    await page.evaluate((e) => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])');
      if (inputs[0]) inputs[0].value = e;
    }, EMAIL);
  }

  const pwInput = await page.$('input[type="password"], input[name="password"], input[autocomplete="current-password"]');
  if (pwInput) {
    await pwInput.fill(PASSWORD);
  } else {
    await page.evaluate((p) => {
      const inputs = document.querySelectorAll('input[type="password"]');
      if (inputs[0]) inputs[0].value = p;
    }, PASSWORD);
  }

  // Click submit button
  const submitBtn = await page.$('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")');
  if (submitBtn) {
    await submitBtn.click();
  } else {
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.type === 'submit' || b.textContent.toLowerCase().includes('sign in') || b.textContent.toLowerCase().includes('login')) {
          b.click();
          return;
        }
      }
    });
  }

  // Wait for navigation away from login page
  try {
    await page.waitForFunction(() => !window.location.href.includes('auth/login'), { timeout: 20000 });
  } catch {
    const errText = await page.evaluate(() => document.body.innerText.includes('Invalid') ? 'Invalid credentials' : '');
    if (errText) throw new Error(errText);
    throw new Error('Login failed - timeout');
  }
  await page.waitForTimeout(2000);
  console.log('[LOGIN] Done');
}

async function ensureLoggedIn(page) {
  const age = (Date.now() - lastLoginTime) / 1000;
  const url = page.url();

  if (url.includes('auth/login') || age > 1200) {
    console.log(`[LOGIN] Session expired or ${Math.round(age)}s old — re-logging in`);
    await login(page);
    return true;
  }
  return false;
}

async function selectSubjectsAndGenerate(page) {
  await page.goto(`${BASE}/create-test`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Step 1: master "Subjects" checkbox (index 0) → selects ALL subjects
  await page.evaluate(() => {
    const cbs = document.querySelectorAll('.custom-checkbox-lg');
    cbs[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  console.log('[CREATE] Clicked master Subjects checkbox');
  await page.waitForTimeout(2000);

  // Step 2: Systems — targeted if TARGET_SYSTEMS env set, else master (index 14) → all
  const targetSystems = (process.env.TARGET_SYSTEMS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (targetSystems.length > 0) {
    console.log(`[CREATE] Targeting systems: ${targetSystems.join(', ')}`);
    const clicked = await page.evaluate((targets) => {
      const cbs = Array.from(document.querySelectorAll('.custom-checkbox-lg'));
      const hit = [];
      for (const cb of cbs) {
        // derived label: parent/innerText next to checkbox (matches inspect-systems dump)
        let label = '';
        const parent = cb.parentElement;
        if (parent) label = parent.innerText?.trim().split('\n')[0] || '';
        if (!label) label = cb.nextElementSibling?.innerText?.trim().split('\n')[0] || '';
        if (!label) continue;
        for (const t of targets) {
          if (label.toLowerCase().includes(t.toLowerCase())) {
            cb.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            hit.push(label);
            break;
          }
        }
      }
      return hit;
    }, targetSystems);
    console.log(`[CREATE] Clicked systems: ${clicked.join(', ') || '(none matched!)'}`);
    if (clicked.length === 0) throw new Error(`TARGET_SYSTEMS no match: ${targetSystems.join(',')}`);
  } else {
    await page.evaluate(() => {
      const cbs = document.querySelectorAll('.custom-checkbox-lg');
      if (cbs[14]) cbs[14].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    console.log('[CREATE] Clicked master Systems checkbox');
  }
  await page.waitForTimeout(2000);

  // Step 3: set Q count = 5 (input is type="text")
  await page.evaluate(() => {
    const input = document.querySelector('input[type="text"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '5');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1000);

  // Step 4: poll until GENERATE TEST enabled
  for (let retry = 0; retry < 15; retry++) {
    const ready = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().replace(/\s+/g, '') === 'GENERATETEST') return !b.disabled;
      }
      return false;
    });
    if (ready) { console.log(`[CREATE] GENERATE TEST ready after ${retry + 1}s`); break; }
    await page.waitForTimeout(1000);
  }

  // Click GENERATE TEST
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.trim().replace(/\s+/g, '') === 'GENERATETEST') {
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return;
      }
    }
  });

  // Poll for exam URL (URL changes immediately after click)
  for (let w = 0; w < 20; w++) {
    const url = page.url();
    const m = url.match(/exam_id=(\d+)/);
    if (m) {
      console.log(`[CREATE] Exam ID: ${m[1]}`);
      return m[1];
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('CREATE_FAILED');
}

async function extractQuestions(page, questionsData) {
  // questionsData from API: [{ qus_id, correct_choice, correct_answer_text, rag_text, ... }]
  const qCount = questionsData.length;
  console.log(`[EXAM] ${qCount} questions`);

  // Wait for exam page to fully render
  await page.waitForTimeout(2000);

  const extracted = [];

  for (let i = 0; i < qCount; i++) {
    const qApi = questionsData[i];
    console.log(`[Q${i + 1}/${qCount}] id=${qApi.qus_id} correct=${qApi.correct_choice}`);

    // Extract question text and choices from DOM
    let qText = '';
    let choices = [];

    for (let attempt = 1; attempt <= 4; attempt++) {
      const domData = await page.evaluate(() => {
        // Use content area div to avoid nav UI noise (question numbers, Mark, Previous, etc.)
        const contentArea = document.querySelector('[class*="content-area"]');
        const body = contentArea?.innerText || document.body.innerText || document.body.textContent || '';

        // If explanation shown, question text is before "Explanation"
        let textPart = body;
        const expIdx = body.indexOf('Explanation');
        if (expIdx >= 0) textPart = body.slice(0, expIdx);

        // If correct/incorrect markers shown, strip those
        const correctIdx = textPart.indexOf('Correct');
        const incorrectIdx = textPart.indexOf('Incorrect');
        if (correctIdx >= 0 && correctIdx < 200) textPart = textPart.slice(0, correctIdx);
        if (incorrectIdx >= 0 && incorrectIdx < 200) textPart = textPart.slice(0, incorrectIdx);

        // Find block time line and strip it
        const blockIdx = textPart.indexOf('Block Time Elapsed');
        if (blockIdx >= 0) textPart = textPart.slice(0, blockIdx);

        // Extract choices from textPart using regex
        const ch = [];
        const choiceRegex = /^([A-F])\)\s*(.+)/gm;
        let m;
        while ((m = choiceRegex.exec(textPart)) !== null) {
          ch.push({ letter: m[1], text: m[2].trim() });
        }

        // Remove the choice lines from textPart to get clean question text
        let cleanText = textPart.replace(/^[A-F]\)\s*.+$/gm, '').trim();
        // Also remove percentages like (21%)
        cleanText = cleanText.replace(/\(\d+%\)/g, '').trim();
        // Remove Item X of Y
        cleanText = cleanText.replace(/Item \d+ of \d+/g, '').trim();
        // Remove Question Id: \d+
        cleanText = cleanText.replace(/Question Id: \d+/g, '').trim();

        return { text: cleanText, choices: ch };
      });

      qText = domData.text;
      choices = domData.choices;
      if (qText.length > 20) break;
      console.log(`[Q${i + 1}] DOM text blank (attempt ${attempt}), retrying...`);
      await page.waitForTimeout(750);
    }

    console.log(`[Q${i + 1}] Text: ${qText.slice(0, 60)}...`);
    console.log(`[Q${i + 1}] Choices: ${choices.map(c => `${c.letter})${c.text}`).join(', ')}`);

    // Check for images
    const imgSrcs = await page.evaluate(() => {
      const contentArea = document.querySelector('[class*="content-area"]') || document.querySelector('main');
      if (!contentArea) return [];
      const imgs = Array.from(contentArea.querySelectorAll('img'));
      return imgs.filter(img => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        return (w > 50 || h > 50);
      }).map(img => img.src);
    });
    if (imgSrcs.length > 0) {
      console.log(`[Q${i + 1}] Images: ${imgSrcs.join(', ')}`);
    }

    // Click the correct answer choice
    const correctLetter = (qApi.correct_choice || '').trim().toUpperCase();
    await page.evaluate((letter) => {
      const choiceDivs = document.querySelectorAll('[class*="answerChoices"] > div');
      for (const d of choiceDivs) {
        const t = d.textContent.trim();
        if (t.startsWith(letter + ')')) {
          d.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return;
        }
      }
    }, correctLetter);
    await page.waitForTimeout(500);

    // Click Submit
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim() === 'Submit') {
          b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return;
        }
      }
    });
    await page.waitForTimeout(500);

    // Wait for explanation - poll
    for (let w = 0; w < 30; w++) {
      const hasExp = await page.evaluate(() => {
        const ca = document.querySelector('[class*="content-area"]');
        return (ca?.innerText || document.body.innerText).includes('Explanation');
      });
      if (hasExp) break;
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);

    // Extract explanation from DOM
    const fullText = await page.evaluate(() => {
      const ca = document.querySelector('[class*="content-area"]');
      return ca?.innerText || document.body.innerText;
    });
    const { explanation, educationalObjective } = extractExplanationFromDOM(fullText);

    console.log(`[Q${i + 1}] Explanation: ${explanation.slice(0, 60)}...`);
    console.log(`[Q${i + 1}] Edu objective: ${educationalObjective.slice(0, 60)}...`);

    // Build structured question data
    const correctAnswer = choices.find(c => c.letter === correctLetter)?.text || '';
    const questionData = {
      text: qText,
      correctAnswer,
      options: choices.map(c => ({
        text: c.text,
        isCorrect: c.letter === correctLetter,
      })),
      explanation,
      educationalObjective,
      textHash: textHash(qText),
      source: 'medicospira',
      qus_id: qApi.qus_id,
      correct_choice: correctLetter,
      imageSrcs: imgSrcs,
      qus_sub_id: qApi.qus_sub_id,
      qus_sys_id: qApi.qus_sys_id,
      qus_cat_id: qApi.qus_cat_id,
      qus_topic_id: qApi.qus_topic_id,
    };

    extracted.push(questionData);

    // Click Next (unless last question)
    if (i < qCount - 1) {
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          if (b.textContent.trim() === 'Next') {
            b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return;
          }
        }
      });
      await page.waitForTimeout(1500);
    }
  }

  // End Block
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.trim() === 'End Block') {
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return;
      }
    }
  });
  await page.waitForTimeout(1000);

  // Confirm Yes in end test modal
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.trim() === 'Yes') {
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return;
      }
    }
  });
  await page.waitForTimeout(2000);

  console.log(`[END] Block ended, ${extracted.length} questions extracted`);
  return extracted;
}

async function saveQuestionsLocally(questions) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const existing = loadQuestions();
  let newCount = 0;

  const lines = questions.map(q => {
    if (isDuplicate(q.text, existing)) {
      console.log(`[SAVE] Skipping duplicate: ${q.text.slice(0, 40)}...`);
      return null;
    }
    newCount++;
    return JSON.stringify({
      text: q.text,
      correctAnswer: q.correctAnswer,
      options: q.options,
      explanation: q.explanation,
      educationalObjective: q.educationalObjective,
      textHash: q.textHash,
      source: q.source,
    });
  }).filter(Boolean);

  if (lines.length > 0) {
    appendFileSync(QUESTIONS_FILE, lines.join('\n') + '\n');
    console.log(`[SAVE] ${lines.length} new questions appended to ${QUESTIONS_FILE} (${newCount} unique)`);
  } else {
    console.log('[SAVE] No new questions');
  }

  return newCount;
}

let browser, context, examPage;

async function setupBrowser() {
  const headless = process.env.HEADLESS !== 'false';
  browser = await chromium.launch({ headless });
  context = await browser.newContext();
  examPage = await context.newPage();

  lastLoginTime = 0;
  await login(examPage);
}

async function restartBrowser() {
  try { await browser?.close(); } catch {}
  console.log('[RESTART] Fresh browser...');
  await setupBrowser();
}

async function setupInterceptor(page) {
  page.on('response', async (response) => {
    if (response.url().includes('/api/v1/api/exam/questions')) {
      try {
        const body = await response.json();
        if (body.status === 'success' && body.data?.questions) {
          capturedQuestions = body.data.questions;
          console.log(`[INTERCEPT] Captured ${capturedQuestions.length} questions`);
        }
      } catch {}
    }
  });
}

let capturedQuestions = null;

async function main() {
  await setupBrowser();
  setupInterceptor(examPage);

  const MAX_BATCHES = parseInt(process.env.MAX_BATCHES || '0');
  let batch = 0;
  let consecutiveFailures = 0;

  while (true) {
    batch++;
    if (MAX_BATCHES && batch > MAX_BATCHES) {
      console.log('[DONE] Reached batch limit');
      break;
    }
    console.log(`\n=== BATCH ${batch} ===`);

    try {
      await ensureLoggedIn(examPage);

      // Reset capture for new batch
      capturedQuestions = null;

      // Create test via browser UI
      const examId = await selectSubjectsAndGenerate(examPage);
      console.log(`[BATCH ${batch}] Exam ${examId}, waiting for questions data...`);

      // Wait for the API response to be intercepted
      for (let w = 0; w < 30 && !capturedQuestions; w++) {
        await new Promise(r => setTimeout(r, 500));
      }

      if (!capturedQuestions) {
        // Fallback: try to get questions directly from API
        console.log('[INTERCEPT] Route intercept failed, trying direct API call...');
        const token = await examPage.evaluate(() => localStorage.getItem('usmle_auth_token_s1'));
        const resp = await fetch(`${API_BASE}/exam/questions?exam_id=${examId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        const data = await resp.json();
        if (data.status === 'success' && data.data?.questions) {
          capturedQuestions = data.data.questions;
        }
      }

      if (!capturedQuestions || capturedQuestions.length === 0) {
        throw new Error('No questions data captured');
      }

      const questions = await extractQuestions(examPage, capturedQuestions);
      console.log(`[BATCH ${batch}] ${questions.length} questions extracted, saving...`);

      const newCount = await saveQuestionsLocally(questions);
      console.log(`[BATCH ${batch}] Done. ${newCount} new questions.`);

      consecutiveFailures = 0;
      await examPage.waitForTimeout(3000);

      if (batch % 10 === 0) {
        await restartBrowser();
        setupInterceptor(examPage);
      }
    } catch (err) {
      if (err.message === 'POOL_EXHAUSTED') {
        console.log('[DONE] Question pool exhausted.');
        break;
      }
      consecutiveFailures++;
      if (consecutiveFailures >= 3) {
        console.error(`[FATAL] Too many consecutive failures (${consecutiveFailures}). Exiting.`);
        break;
      }
      if (err.message === 'SESSION_EXPIRED') {
        console.log(`[BATCH ${batch}] Session expired — re-logging in and retrying`);
        await login(examPage);
        batch--;
        continue;
      }
      if (err.message.includes('closed') || err.message.includes('Target page') || err.message.includes('ERR_ABORTED') || err.message.includes('detached')) {
        console.log(`[BATCH ${batch}] Browser crashed — restarting and retrying`);
        await restartBrowser();
        setupInterceptor(examPage);
        batch--;
        continue;
      }
      console.log(`[BATCH ${batch}] Error:`, err.message, '— restarting');
      await restartBrowser();
      setupInterceptor(examPage);
      batch--;
      continue;
    }
  }

  await browser?.close();
  console.log('[STOP] Done');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
