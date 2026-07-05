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
const BLOBS_FILE = path.join(DATA_DIR, 'medicospira-blobs.jsonl');
const QUESTIONS_FILE = path.join(DATA_DIR, 'medicospira-questions.jsonl');
const PARSER_SCRIPT = path.resolve(__dirname, 'parse-medicospira-blobs.py');

const BASE = 'https://www.medicospira.com/s1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const AI_PROVIDER = process.env.AI_PROVIDER || 'self'; // 'deepseek', 'gemini', or 'self'

function cleanText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function findKnownAnswer(questionText, choices) {
  try {
    const targetCleaned = cleanText(questionText);
    if (!targetCleaned) return null;
    if (!existsSync(QUESTIONS_FILE)) return null;

    const content = readFileSync(QUESTIONS_FILE, 'utf8');
    const lines = content.trim().split('\n');
    for (const line of lines) {
      if (!line) continue;
      try {
        const q = JSON.parse(line);
        if (q.text && q.correctAnswer) {
          const qCleaned = cleanText(q.text);
          if (qCleaned === targetCleaned) {
            const correctText = q.correctAnswer;
            const normCorrect = correctText.toLowerCase().replace(/\s+/g, ' ').trim();
            const matchedChoice = choices.find(c => {
              const normC = c.text.toLowerCase().replace(/\s+/g, ' ').trim();
              return normC === normCorrect || normC.includes(normCorrect) || normCorrect.includes(normC);
            });
            if (matchedChoice) {
              console.log(`[LOOKUP] Found remembered correct answer: ${matchedChoice.letter} (${correctText})`);
              return matchedChoice.letter;
            }
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.log(`[LOOKUP] Error during lookup: ${err.message}`);
  }
  return null;
}

async function predictAnswer(questionText, choices, imagePaths = [], eId = 'unknown', qIndex = 0) {
  // Try to use a remembered correct answer first
  const known = findKnownAnswer(questionText, choices);
  if (known) {
    return known;
  }

  if (AI_PROVIDER === 'self') {
    const tempDir = path.resolve(__dirname, '..', 'data', 'temp');
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

    const qPath = path.join(tempDir, `question_${eId}_${qIndex}.json`);
    const aPath = path.join(tempDir, `answer_${eId}_${qIndex}.json`);

    // Remove any stale answer file
    try { if (existsSync(aPath)) unlinkSync(aPath); } catch {}

    // Write question details
    writeFileSync(qPath, JSON.stringify({
      question: questionText,
      choices,
      images: imagePaths
    }, null, 2));

    console.log(`\n[SELF] Question written to ${qPath}. Waiting for answer...`);

    // Poll for answer_[eId]_[qIndex].json
    while (true) {
      if (existsSync(aPath)) {
        try {
          const content = readFileSync(aPath, 'utf8');
          const data = JSON.parse(content);
          const answer = data.answer?.trim().toUpperCase();
          if (answer && choices.some(c => c.letter === answer)) {
            console.log(`[SELF] Answer received: ${answer}`);
            // Clean up files
            try { unlinkSync(qPath); } catch {}
            try { unlinkSync(aPath); } catch {}
            return answer;
          }
        } catch (e) {
          // JSON parsing issue or file busy, wait
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const choicesText = choices.map(c => `${c.letter}. ${c.text}`).join('\n');
  const validLetters = choices.map(c => c.letter).join('/');
  const prompt = `You are answering a USMLE Step 1 question.
Analyze the clinical vignette step-by-step, evaluate each choice, rule out distractors, and arrive at the correct diagnosis/mechanism. Keep your reasoning extremely concise (under 150 words) to avoid truncation.

Provide your output in exactly this XML-like format:
<reasoning>
Step-by-step clinical reasoning and analysis of the choices (under 150 words).
</reasoning>
<final_answer>
Single letter of the correct choice (one of: ${validLetters})
</final_answer>

Question:
${questionText}

Choices:
${choicesText}`;

  try {
    let url, headers, body;
    if (AI_PROVIDER === 'gemini') {
      if (!OPENROUTER_API_KEY) {
        console.log('[AI] No OpenRouter API key for Gemini, falling back to first choice');
        return choices[0]?.letter || 'A';
      }
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Ugent',
      };
      body = {
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-pro',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0,
      };
    } else {
      if (!DEEPSEEK_API_KEY) {
        console.log('[AI] No DeepSeek API key, falling back to first choice');
        return choices[0]?.letter || 'A';
      }
      url = 'https://api.deepseek.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      };
      body = {
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0,
      };
    }

    let response;
    let attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        });
        if (response.ok) break;
        console.log(`[AI] Bad response status: ${response.status}. Retrying (${attempt}/${attempts})...`);
      } catch (err) {
        console.log(`[AI] Fetch error: ${err.message}. Retrying (${attempt}/${attempts})...`);
        if (attempt === attempts) throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    // Print reasoning if present
    const reasoningMatch = text.match(/<reasoning>([\s\S]*?)<\/reasoning>/i);
    if (reasoningMatch && reasoningMatch[1].trim()) {
      console.log(`\n[AI Reasoning]:\n${reasoningMatch[1].trim()}\n`);
    }

    // Extract final answer
    const finalAnswerMatch = text.match(/<final_answer>\s*([A-Z])\s*<\/final_answer>/i);
    let predictedLetter = '';
    if (finalAnswerMatch) {
      predictedLetter = finalAnswerMatch[1].toUpperCase();
    } else {
      // Fallback: look for a single letter in the text
      const fallbackMatch = text.match(/(?:^|\n|[\s"'\.])([A-Z])(?:$|\n|[\s"'\.])/);
      if (fallbackMatch) {
        predictedLetter = fallbackMatch[1].toUpperCase();
      }
    }

    const validLettersList = choices.map(c => c.letter);
    if (predictedLetter && validLettersList.includes(predictedLetter)) {
      console.log(`[AI] Predicted (${AI_PROVIDER}): ${predictedLetter}`);
      return predictedLetter;
    }

    console.log(`[AI] Unexpected response: "${text}", using first choice. Full response: ${JSON.stringify(data)}`);
    return choices[0]?.letter || 'A';
  } catch (err) {
    console.log(`[AI] API error: ${err.message}, using first choice`);
    return choices[0]?.letter || 'A';
  }
}

let lastLoginTime = 0;

async function login(page) {
  lastLoginTime = Date.now();
  await page.goto(`${BASE}/login.php`, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
  console.log('[LOGIN] Done');
}

async function ensureLoggedIn(page) {
  // Force re-login every 20 minutes to prevent session expiry
  const age = (Date.now() - lastLoginTime) / 1000;
  const url = page.url();

  if (url.includes('login.php') || url.includes('signup') || age > 1200) {
    console.log(`[LOGIN] Session expired or ${Math.round(age)}s old — re-logging in`);
    await login(page);
    return true;
  }
  return false;
}

async function createTest(page) {
  await ensureLoggedIn(page);

  // Go to welcome if not there
  if (!page.url().includes('welcome')) {
    await page.goto(`${BASE}/welcome.php`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
  }

  await page.evaluate(() => {
    document.body.classList.add('sidebar-main');
    document.querySelector('#v-pills-create-tab')?.click();
  });
  await page.waitForTimeout(1000);

  // Select question pool dynamically based on environment variable
  const poolType = process.env.QUESTION_POOL || 'Incorrect';
  await page.evaluate((type) => {
    let radio;
    if (type === 'Omitted') {
      radio = document.querySelector('#omittedRadio');
    } else if (type === 'Marked') {
      radio = document.querySelector('#markedRadio');
    } else if (type === 'Unused') {
      radio = document.querySelector('#unusedRadio');
    } else if (type === 'All') {
      radio = document.querySelector('#allRadio');
    } else {
      radio = document.querySelector('#incorrectRadio');
    }
    if (radio) {
      radio.click();
    }
  }, poolType);
  await page.waitForTimeout(1000);

  // Click select all subjects programmatically
  await page.evaluate(() => {
    const subAll = document.querySelector('.selectALLSUB');
    if (subAll) {
      subAll.click();
    }
  });
  await page.waitForTimeout(1000);

  // Click select all systems programmatically (which also checks categories)
  await page.evaluate(() => {
    const sysAll = document.querySelector('.selectALLSYS');
    if (sysAll) {
      sysAll.click();
    }
  });
  await page.waitForTimeout(1500);

  // Set question number count
  await page.evaluate(() => {
    const num = document.querySelector('#number_qbox');
    if (num) {
      num.value = '5';
      num.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1000);

  // Validate pool count from the corresponding badge element
  const poolCount = await page.evaluate((type) => {
    let badge;
    if (type === 'Omitted') {
      badge = document.querySelector('#omitted_countlabel');
    } else if (type === 'Marked') {
      badge = document.querySelector('#marked_countlabel');
    } else if (type === 'Unused') {
      badge = document.querySelector('#unused_countlabel');
    } else if (type === 'All') {
      badge = document.querySelector('#all_countlabel');
    } else {
      badge = document.querySelector('#incorrect_countlabel');
    }
    return badge ? badge.textContent.trim() : '0';
  }, poolType);
  console.log(`[CREATE] Pool ${poolType} available questions count: ${poolCount}`);
  if (poolCount === '0' || poolCount === '') {
    throw new Error('POOL_EXHAUSTED');
  }

  // Submit test creation
  await page.evaluate(() => document.querySelector('#create_test_btn')?.click());
  await page.waitForTimeout(5000);

  // Session expiry check
  if (page.url().includes('login.php')) {
    console.log('[CREATE] Session expired after create click');
    throw new Error('SESSION_EXPIRED');
  }

  const eId = page.url().match(/e_id=(\d+)/)?.[1];
  if (!eId) throw new Error('Failed to create test');
  console.log(`[CREATE] Test e_id=${eId}`);
  return eId;
}

async function extractQuestions(page, eId) {
  await page.goto(`${BASE}/exam.php?e_id=${eId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check if session expired (redirected to login)
  if (page.url().includes('login.php')) {
    console.log('[EXAM] Session expired during extraction');
    throw new Error('SESSION_EXPIRED');
  }

  // Read actual Q count
  const qCountStr = await page.evaluate(() =>
    document.body.innerText.match(/Item 1 of (\d+)/)?.[1] || '5'
  );
  const numQs = parseInt(qCountStr);
  console.log(`[EXAM] ${numQs} questions`);

  // Define extractor
  await page.evaluate(() => {
    window.__extract = function() {
      const panel = document.querySelector('[role="tabpanel"]') || document.body;
      const paras = Array.from(panel.querySelectorAll('p')).map(p => p.textContent.trim()).filter(t => t.length > 10);
      const choices = Array.from(panel.querySelectorAll('input[type=radio]')).map(r => {
        const sib = r.nextElementSibling; return sib ? sib.textContent.trim() : '';
      }).filter(t => t.length > 0);
      const vt = document.body.innerText;
      const expIdx = vt.indexOf('Explanation\n');
      let expText = '';
      if (expIdx >= 0) {
        const footerIdx = vt.indexOf('block time remaing', expIdx);
        const endIdx = footerIdx > expIdx ? footerIdx : expIdx + 5000;
        expText = vt.slice(expIdx + 'Explanation\n'.length, endIdx).trim();
      }
      // Find correct answer from textContent (includes hidden text)
      let correct = '';
      const fullText = document.body.textContent;
      const caPos = fullText.indexOf('Correct Answer');
      if (caPos >= 0) {
        const win = fullText.slice(caPos, caPos + 100);
        const m = win.match(/Correct Answer\s*[:\-]\s*([A-Z])/);
        if (m) {
          const letterPos = caPos + m.index + m[0].length - 1;
          if (!fullText.slice(letterPos, letterPos + 5).match(/xplanation/i)) {
            correct = m[1];
          }
        }
      }
      return `${paras.join('\n\n')}\n\n${choices.join('\n')}\nCorrect Answer: ${correct}\n\nExplanation:\n${expText}`;
    };
  });

  const blobs = [];
  for (let i = 1; i <= numQs; i++) {
    console.log(`[Q${i}] Reading question...`);

    // Extract question text + choices before answering
    const qInfo = await page.evaluate(() => {
      const panel = document.querySelector('[role="tabpanel"]') || document.body;
      const paras = Array.from(panel.querySelectorAll('p, table, ul, ol')).map(p => p.innerText.trim()).filter(t => t.length > 5);
      const choices = Array.from(panel.querySelectorAll('input[type=radio]')).map((r, idx) => ({
        index: idx,
        letter: String.fromCharCode(65 + idx),
        text: r.nextElementSibling ? r.nextElementSibling.innerText.trim() : ''
      })).filter(c => c.text.length > 0);
      const imgs = Array.from(panel.querySelectorAll('img')).filter(img => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const isTarget = w > 50 || h > 50;
        if (isTarget) {
          img.classList.add('usmle-image-target');
        }
        return isTarget;
      });
      return { questionText: paras.join('\n\n'), choices, hasImages: imgs.length > 0, imageCount: imgs.length };
    });

    console.log(`[Q${i}] Extracted qInfo: ${qInfo.questionText.substring(0, 40)}... (hasImages: ${qInfo.hasImages}, count: ${qInfo.imageCount})`);

    // Screenshot individual images if any
    const imagePaths = [];
    if (qInfo.hasImages) {
      const tempDir = path.resolve(__dirname, '..', 'data', 'temp');
      if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
      const fullPagePath = path.join(tempDir, 'current_page.png');
      try {
        await page.screenshot({ path: fullPagePath, fullPage: true });
        imagePaths.push(fullPagePath); // Include the full page view for context
      } catch (err) {
        console.log(`[Q${i}] Full-page screenshot failed: ${err.message}`);
      }

      for (let imgIdx = 0; imgIdx < qInfo.imageCount; imgIdx++) {
        const imgPath = path.join(tempDir, `img_${Date.now()}_${imgIdx}.png`);
        try {
          console.log(`[Q${i}] Taking screenshot of image ${imgIdx}...`);
          const imgLocator = page.locator('img.usmle-image-target').nth(imgIdx);
          await imgLocator.screenshot({ path: imgPath, timeout: 2000 });
          imagePaths.push(imgPath);
          console.log(`[Q${i}] Screenshot saved to ${imgPath}`);
        } catch (err) {
          console.log(`[Q${i}] Screenshot error/timeout for image ${imgIdx}: ${err.message}`);
        }
      }
    }

    // Predict the correct answer
    const predictedLetter = await predictAnswer(qInfo.questionText, qInfo.choices, imagePaths, eId, i);
    const predictedIndex = qInfo.choices.findIndex(c => c.letter === predictedLetter);

    // Click predicted answer + submit
    console.log(`[Q${i}] Selecting ${predictedLetter} (index ${predictedIndex})...`);
    await page.evaluate(({ idx, hasNext }) => {
      const radios = document.querySelectorAll('input[type=radio]');
      if (idx >= 0 && idx < radios.length) {
        radios[idx].click();
      } else if (radios.length > 0) {
        radios[0].click();
      }
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit');
      if (submitBtn) submitBtn.click();
    }, { idx: predictedIndex >= 0 ? predictedIndex : 0, hasNext: i < numQs });

    // Wait for explanation, then give page time to fully render
    try {
      await page.waitForFunction(() => document.body.innerText.includes('Explanation'), { timeout: 20000 });
      await page.waitForTimeout(4000);
    } catch (err) {
      console.log(`[Q${i}] Wait issue: ${err.message?.substring(0, 40)}`);
      await page.waitForTimeout(3000);
    }

    // Re-inject extractor in case the page navigated and lost it
    await page.evaluate(() => {
      if (!window.__extract) {
        window.__extract = function() {
          const panel = document.querySelector('[role="tabpanel"]') || document.body;
          const paras = Array.from(panel.querySelectorAll('p')).map(p => p.textContent.trim()).filter(t => t.length > 10);
          const choices = Array.from(panel.querySelectorAll('input[type=radio]')).map(r => {
            const sib = r.nextElementSibling; return sib ? sib.textContent.trim() : '';
          }).filter(t => t.length > 0);
          const vt = document.body.innerText;
          const expIdx = vt.indexOf('Explanation\n');
          let expText = '';
          if (expIdx >= 0) {
            const footerIdx = vt.indexOf('block time remaing', expIdx);
            const endIdx = footerIdx > expIdx ? footerIdx : expIdx + 5000;
            expText = vt.slice(expIdx + 'Explanation\n'.length, endIdx).trim();
          }
          let correct = '';
          const fullText = document.body.textContent;
          const caPos = fullText.indexOf('Correct Answer');
          if (caPos >= 0) {
            const win = fullText.slice(caPos, caPos + 100);
            const m = win.match(/Correct Answer\s*[:\-]\s*([A-Z])/);
            if (m) {
              const letterPos = caPos + m.index + m[0].length - 1;
              if (!fullText.slice(letterPos, letterPos + 5).match(/xplanation/i)) {
                correct = m[1];
              }
            }
          }
          return `${paras.join('\n\n')}\n\n${choices.join('\n')}\nCorrect Answer: ${correct}\n\nExplanation:\n${expText}`;
        };
      }
    });

    // Extract
    const blob = await page.evaluate(() => window.__extract());
    blobs.push(blob);
    console.log(`[Q${i}] Extracted: ${blob.substring(0, 50)}...`);

    if (i < numQs) {
      // Click right arrow
      await page.evaluate(() => {
        const arrow = document.querySelector('i.la-caret-right');
        if (arrow) arrow.click();
      });
      await page.waitForTimeout(1000);
    }
  }

  // End block
  await page.evaluate(() => {
    const f = document.querySelector('#endform');
    f.style.display = 'block';
    const yesBtn = Array.from(f.querySelectorAll('button,a')).find(el => el.textContent.trim() === 'Yes');
    if (yesBtn) yesBtn.click();
  });
  await page.waitForTimeout(2000);
  console.log(`[END] Block ended, ${blobs.length} questions extracted`);
  return blobs;
}

async function saveBlobsLocally(blobs) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // Append raw blobs as JSON lines
  const now = Date.now();
  const lines = blobs.map((text, i) => JSON.stringify({
    text,
    index: i,
    extractedAt: now,
  }));
  appendFileSync(BLOBS_FILE, lines.join('\n') + '\n');
  console.log(`[SAVE] ${blobs.length} blobs appended to ${BLOBS_FILE}`);

  // Run parser to convert to structured JSONL
  try {
    const result = execSync(`python3 "${PARSER_SCRIPT}"`, { encoding: 'utf8', timeout: 30000 });
    console.log(result.trim());
  } catch (err) {
    console.error(`[PARSE] Error: ${err.stderr?.trim() || err.message}`);
  }
}

let browser, context, examPage;

async function setupBrowser() {
  browser = await chromium.launch({ headless: false });
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

async function main() {
  await setupBrowser();

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
      const eId = await createTest(examPage);
      const blobs = await extractQuestions(examPage, eId);
      console.log(`[BATCH ${batch}] ${blobs.length} blobs, ingesting...`);

      await saveBlobsLocally(blobs);
      console.log(`[BATCH ${batch}] Done. Starting next...\n`);
      consecutiveFailures = 0;
      await examPage.waitForTimeout(3000); // cooldown between batches

      if (batch % 10 === 0) {
        await restartBrowser();
      }
    } catch (err) {
      if (err.message === 'POOL_EXHAUSTED') {
        console.log('[DONE] Question pool is exhausted.');
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
        batch--;
        continue;
      }
      console.log(`[BATCH ${batch}] Unexpected error:`, err.message, '— restarting');
      await restartBrowser();
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
