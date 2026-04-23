---
name: medicospira-ingestion-flow
description: Use when working through Medicospira question blocks and transferring results into the local research ingestion dashboard. Covers login, skipping the PayPal gate with Continue Free, creating short tests, answering questions with Playwright, ending blocks, and queueing paraphrased ingestion entries without copying protected text verbatim.
---

# Medicospira Ingestion Flow

## Overview

Use this skill for the repeatable Medicospira -> Ugent research-ingestion workflow in this workspace.
It is optimized for Playwright MCP and the local Next app at `http://localhost:3000/research/ingest`.

Operate in one of these procedures depending on the user's request:
- `create_test`
- `answer_and_queue_one`
- `speedrun_q1_q5`
- `end_block`

## Workflow

1. Open Medicospira login at `https://www.medicospira.com/uworld1/login.php`.
2. Log in, then follow `Continue Free` on the PayPal step.
3. Create a test by selecting subjects/systems and setting the question count.
4. Work through questions with Playwright, capturing metadata plus strategy-grade paraphrased signals.
5. Type paraphrased ingestion entries into the Research Ingestion Dashboard and queue them.
6. End the block with the confirmation fallback when the visible footer control is flaky.

After every navigation or major state change, always run:
- `browser_console_messages` with `level: "error"`
- `browser_take_screenshot`

For every completed question, produce a compact result record with:
- `question_id`
- `exam_id`
- `selected_answer`
- `correct_answer`
- `result`
- `subject_guess`
- `system_guess`
- `topic_guess`
- `key_clues`
- `key_symptoms`
- `ingestion_status`
- `screenshot_path`

## Procedures

### `create_test`

1. Open Medicospira and authenticate.
2. If the PayPal interstitial appears, click `Continue Free`.
3. Navigate to create-test using the DOM-driven flow below.
4. Select all available `subject[]` and `System[]` options unless the user requests a narrower scope.
5. Set `#number_qbox` to the requested count.
6. Submit with `#create_test_btn`.
7. Verify the resulting URL contains `exam.php?e_id=` and capture the `exam_id`.

### `answer_and_queue_one`

1. Answer one question.
2. Submit and wait for the review state.
3. Extract metadata from the review page.
4. Prepare one structured paraphrased ingestion entry with clues, symptoms, context, and distractor rule-outs.
5. Type it into `http://localhost:3000/research/ingest`.
6. Wait for `Queue 1 new question`.
7. Click the queue button.
7. Verify the dashboard shows `1 queued` before reporting success.

### `speedrun_q1_q5`

1. Start from question 1 review or question 1 unanswered state.
2. Answer, submit, paraphrase, and queue each question through question 5.
3. Prefer numbered tabs to advance between questions.
4. Default to one-by-one ingestion, not a single bulk paste.
5. For each question: clear the textarea, type one structured paraphrased entry, wait for `Queue 1 new question`, click it, and verify `1 queued` or a new `WAITING FOR BATCH` row.
6. Keep one result record per question.

### `end_block`

1. Attempt the normal visible `End Block` flow if it is responsive.
2. If it is flaky, use the hidden `#endform` fallback.
3. Click `Yes` on the confirmation modal or confirmation control.
4. Expect the intermediate result page `https://www.medicospira.com/uworld1/test_result.php?id=<exam_id>`.
5. Click the `Home` link from the result page.
6. Verify the final URL is exactly `https://www.medicospira.com/uworld1/welcome.php`.

## Hard-Won Workarounds

### Medicospira navigation

- Always treat the `Continue Free` path as part of the login flow when the PayPal page appears.
- The visible `End Block` footer control is unreliable.
- The stable fallback is to reveal `#endform`, then click `#end_confirm`:

```js
const form = document.querySelector('#endform');
if (form) form.style.display = 'block';
document.querySelector('#end_confirm')?.click();
```

- After clicking `#end_confirm`, expect `test_result.php?id=<exam_id>` before clicking `Home`.
- The right-arrow next-question control can be flaky from review state.
- Prefer clicking the numbered question tabs (`2`, `3`, `4`, `5`) instead of relying on the arrow.

- Do not assume a click worked just because the UI changed briefly.
- Re-check URL, console errors, and a screenshot after every major transition.

### Test creation

On Medicospira welcome page, the stable create-test flow is DOM-driven:

```js
document.body?.classList?.add('sidebar-main');
document.querySelector('#v-pills-create-tab')?.click();
```

Then check all available:
- `input[name="subject[]"]`
- `input[name="System[]"]`

Set:
- `#number_qbox` to the desired count

Submit with:
- `#create_test_btn`

### Research ingestion

- The local ingestion target is `http://localhost:3000/research/ingest`.
- If the app is not running, start it from the repo root with `npm run dev`.
- The ingestion textarea uses `---NEXT-QUESTION---` as the delimiter.
- Prefer one entry at a time even though the dashboard supports delimiters.
- Do not rely on setting `textarea.value = ...` alone. The React state may not update.
- Prefer real user-like typing with Playwright into the textarea so the button state changes.
- Queue success must be validated from the visible button/result text such as `1 queued` and/or a new `WAITING FOR BATCH` row.
- If bulk paste leaves the queue button disabled, clear the field and re-enter one item by typing.

## Content Policy Guardrail

Do not paste full question text, answer sets, or explanations from Medicospira into another system.

Only transfer:
- source metadata
- question id
- exam id
- subject guess
- system guess
- topic guess
- paraphrased stem with decisive facts preserved
- normalized answer labels
- selected answer letter
- correct answer letter
- clinical context
- key symptoms
- high-leverage clues
- paraphrased distractor rule-outs
- prerequisites
- paraphrased explanation
- educational objective

Keep each entry in original wording. Summarize medical reasoning instead of copying.

## Recommended Entry Format

Use this exact structure for each queued item:

```text
SOURCE: Medicospira Step 1
QUESTION_ID: <id>
EXAM_ID: <id>
SOURCE_URL: https://www.medicospira.com/uworld1/exam.php?e_id=<id>
SUBJECT_GUESS: <subject>
SYSTEM_GUESS: <system>
TOPIC_GUESS: <topic>
TOPIC_TYPE_GUESS: <DISEASE | PATHOGEN | PRINCIPLE | DRUG | SYNDROME | CONCEPT>

CLINICAL_CONTEXT:
- Age: <if known>
- Gender: <if known>
- Physiology State: <if known>
- Onset Pattern: <acute/subacute/chronic/intermittent/etc>

PARAPHRASED_STEM:
<2-4 sentence paraphrase preserving the decisive facts, not just the theme>

KEY_SYMPTOMS:
- ...
- ...

HIGH_LEVERAGE_CLUES:
- ...
- ...

ANSWER_OPTIONS_NORMALIZED:
A. ...
B. ...

USER_SELECTED_ANSWER: <letter>
CORRECT_ANSWER: <letter>

DISTRACTOR_RULE_OUTS:
- <distractor label>: <short paraphrased reason it is wrong>
- <distractor label>: <short paraphrased reason it is wrong>

MECHANISM_SUMMARY:
<core pathophysiology or tested principle in 1-2 sentences>

PREREQUISITES:
- ...
- ...

PARAPHRASED_EXPLANATION:
<2-4 sentence paraphrase of why the correct answer is right>

EDUCATIONAL_OBJECTIVE:
<one-line teaching point>

INGESTION_NOTES:
This entry is intentionally paraphrased and condensed for downstream extraction.
```

If the user explicitly wants bulk mode, separate entries with:

```text
---NEXT-QUESTION---
```

## Useful Playwright Patterns

### Extract current question metadata

```js
const text = document.body.innerText || '';
const qid = (text.match(/Question Id:\s*(\d+)/) || [])[1] || '';
const correct = (text.match(/The Correct Answer\s+([A-Z])/i) || [])[1] || '';
```

### Random answer submission

```js
const radios = page.locator('input[type="radio"]:not([disabled])');
const count = await radios.count();
const index = Math.floor(Math.random() * count);
await radios.nth(index).click();
await page.getByRole('button', { name: 'Submit' }).click();
```

### Queue one ingestion entry

Prefer this exact interaction pattern:
- click the textarea
- `ControlOrMeta+A`
- `Backspace`
- type one paraphrased entry
- wait for `Queue 1 new question`
- click the queue button
- verify `1 queued`

## Strategy Quality Bar

The downstream strategy system depends heavily on:
- `diseaseName` / focal concept
- `highLeverageClues`
- `mechanism`
- `discriminators`
- `prerequisites`

Therefore, every entry should preserve:
- the decisive patient context
- the unique clue phrases in paraphrased form
- why the right answer wins
- why at least 2 strong distractors lose
- the prerequisite knowledge a learner needed to solve it

Avoid overly thin summaries like:
- one-line stem paraphrases with no context
- answer lists without rule-out logic
- explanation summaries that omit the actual mechanism

Good entries are short, but dense with differentiating signal.

## Retry Rules

- If the right-arrow fails, switch immediately to numbered question tabs.
- If the visible end-block control fails, reveal `#endform` and click `#end_confirm`.
- If the queue button stays disabled after text insertion, clear the textarea and re-enter one item by typing.
- If queueing does not show `1 queued`, confirm a new `WAITING FOR BATCH` row before retrying.
- If Medicospira reaches `test_result.php` but not `welcome.php`, click the `Home` link and verify again.

## Validation

A successful run should end with:
- all handled questions answered and recorded
- ingestion entries queued one by one
- Medicospira back on `welcome.php`
- end-block flow passing through `test_result.php?id=<exam_id>`
- ingestion dashboard showing queued items in `Recent Ingestions`
- no console errors on the local dashboard
- every handled question having a result record with answer/result/ingestion metadata

Medicospira itself may still emit site-side JS errors. Treat those as expected unless they block the flow.
