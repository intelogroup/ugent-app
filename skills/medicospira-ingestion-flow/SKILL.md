---
name: medicospira-ingestion-flow
description: Use when working through Medicospira question blocks and transferring results into the local research ingestion dashboard. Covers login, skipping the PayPal gate with Continue Free, creating short tests, answering questions with Playwright, ending blocks, and queueing paraphrased ingestion entries without copying protected text verbatim.
---

# Medicospira Ingestion Flow

## Overview

Use this skill for the repeatable Medicospira -> Ugent research-ingestion workflow in this workspace.
It is optimized for Playwright MCP and the production app at `https://ugent-app.vercel.app/research/ingest`.

Operate in one of these procedures depending on the user's request:
- `create_test`
- `answer_and_queue_one`
- `speedrun_q1_q5`
- `end_block`

## Workflow

1. Open Medicospira login at `https://www.medicospira.com/uworld1/login.php`.
2. Log in, then follow `Continue Free` on the PayPal step.
3. Create a test by selecting subjects/systems and setting the question count.
4. Work through questions with Playwright, capturing metadata.
5. Send raw or paraphrased ingestion entries into the Research Ingestion Dashboard as requested.
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
4. Select available `subject[]` and `System[]` options.
5. Set `#number_qbox` to the requested count.
6. Submit with `#create_test_btn`.
7. Verify the resulting URL contains `exam.php?e_id=` and capture the `exam_id`.

### `answer_and_queue_one`

1. Answer one question.
2. Submit and wait for the review state.
3. Extract metadata from the review page.
4. Prepare one structured ingestion entry (raw or paraphrased).
5. Type it into `https://ugent-app.vercel.app/research/ingest`.
6. Wait for `Queue 1 new question`.
7. Click the queue button.
7. Verify the dashboard shows `1 queued` before reporting success.

### `speedrun_q1_q5`

1. Start from question 1 review or question 1 unanswered state.
2. Answer, submit, and queue each question through question 5.
3. Prefer numbered tabs to advance between questions.
4. Default to one-by-one ingestion, not a single bulk paste.
5. For each question: clear the textarea, type one structured entry, wait for `Queue 1 new question`, click it, and verify `1 queued` or a new `WAITING FOR BATCH` row.
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

Then check available:
- `input[name="subject[]"]`
- `input[name="System[]"]`

Set:
- `#number_qbox` to the desired count

Submit with:
- `#create_test_btn`

### Research ingestion

- The production ingestion target is `https://ugent-app.vercel.app/research/ingest`.
- The ingestion textarea uses `---NEXT-QUESTION---` as the delimiter.
- Prefer one entry at a time even though the dashboard supports delimiters.
- Do not rely on setting `textarea.value = ...` alone. The React state may not update.
- Prefer real user-like typing with Playwright into the textarea so the button state changes.
- Queue success must be validated from the visible button/result text such as `1 queued` and/or a new `WAITING FOR BATCH` row.
- If bulk paste leaves the queue button disabled, clear the field and re-enter one item by typing.

## Content Policy Guardrail

Transfer:
- source metadata
- question id
- exam id
- subject guess
- system guess
- topic guess
- question stem (raw or paraphrased as requested)
- normalized answer labels
- selected answer letter
- correct answer letter
- clinical context
- key symptoms
- high-leverage clues
- distractor rule-outs
- prerequisites
- explanation (raw or paraphrased as requested)
- educational objective

## Automated Loop (Self-Solver Mode)

To populate the local question database efficiently in bulk, you can run the automated batch loop script in self-solving mode where the current active agent (Antigravity) solves each question.

### Execution
1. **Start the Loop**: Run the loop script in the background:
   ```bash
   node scripts/medicospira-loop.mjs
   ```
   *Note: `AI_PROVIDER` now defaults to `self`.*
2. **Clear Stale Files**: Before launching, ensure temp directories are clean:
   ```bash
   rm -f data/temp/question_*.json data/temp/answer_*.json
   ```

### Autonomous Agent Solver Loop
Since the agent runs turn-by-turn inside a chat session, you can execute a fully autonomous solver loop without user interaction:

1. **Scheduled Waking**: Schedule a progress-check timer (e.g., 10 seconds) using the `schedule` tool, then yield your turn.
2. **Polling active questions**: On wake-up, run the active question helper:
   ```bash
   python3 scripts/get-active-question.py
   ```
3. **Reasoning Protocol**:
   - **No Web Search**: You MUST NOT use any web search tool to predict the correct choice. Rely entirely on your own extensive medical training data and clinical knowledge.
   - **Visuals**: If the question contains images, inspect them using `view_file` to verify relevant clinical findings (e.g., histology, CT scans, rashes).
4. **Answer Submission**: Submit the answer letter using the solve-question script:
   ```bash
   python3 scripts/solve-question.py B
   ```
5. **Next Tick**: Schedule the next 10-second timer and yield the turn. Repeat this cycle until the scraper task finishes.



