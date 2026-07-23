// Eval harness for the Clea system prompt (app/api/clea-chat/route.ts).
// Sends real requests at a running dev server and checks the streamed
// reply against the prompt's own rules — abbreviation ban, brevity, no
// markdown, no vignette reread, no leading with the answer, screen-access
// claims, ASR mishearing, and tool-calling for progress/attempts questions.
// Run: node scripts/eval-clea-prompt.mjs (dev server must be running on :3000)

const BASE = process.env.CLEA_BASE_URL || 'http://localhost:3000';

const ABBREVIATIONS = ['HSV', 'CSF', ' TB ', 'MI ', 'CNS', ' IM ', ' IV ', ' PO ', 'mg ', 'mL ', 'UTI', 'CBC', 'BP ', 'HR '];
const MARKDOWN_CHARS = /(\*\*|^\s*[-*]\s|^\s*#{1,6}\s|^\s*\d+\.\s)/m;

async function sendMessage({ text, activity = null, quizAttempts = [], id = `eval-${Date.now()}-${Math.random().toString(36).slice(2)}` }) {
  const res = await fetch(`${BASE}/api/clea-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      message: { id: 'm1', role: 'user', parts: [{ type: 'text', text }] },
      activity,
      quizAttempts,
    }),
  });
  const body = await res.text();
  const textDeltas = [...body.matchAll(/"type":"text-delta","id":"[^"]*","delta":"((?:\\.|[^"\\])*)"/g)]
    .map((m) => JSON.parse(`"${m[1]}"`));
  const toolCalls = [...body.matchAll(/"type":"tool-input-available"[^}]*"toolName":"([^"]*)"/g)].map((m) => m[1]);
  return { status: res.status, reply: textDeltas.join(''), toolCalls, raw: body };
}

function countSentences(text) {
  return (text.match(/[.!?]+(\s|$)/g) || []).length;
}

const cases = [
  {
    name: 'abbreviation ban — treatment question',
    input: { text: 'whats the treatment for primary syphilis' },
    check: (r) => {
      const hit = ABBREVIATIONS.find((a) => r.reply.includes(a));
      return hit ? `contains abbreviation "${hit.trim()}"` : null;
    },
  },
  {
    name: 'abbreviation ban — disease shorthand',
    input: { text: 'what causes a heart attack' },
    check: (r) => {
      const hit = ABBREVIATIONS.find((a) => r.reply.includes(a));
      return hit ? `contains abbreviation "${hit.trim()}"` : null;
    },
  },
  {
    name: 'no markdown formatting',
    input: { text: 'list the classic findings of Turner syndrome' },
    check: (r) => (MARKDOWN_CHARS.test(r.reply) ? 'reply contains markdown syntax' : null),
  },
  {
    name: 'brevity — 1-3 sentences',
    input: { text: 'explain the pathophysiology of asthma' },
    check: (r) => {
      const n = countSentences(r.reply);
      return n > 4 ? `reply has ${n} sentences (expected <=3, allowing slack)` : null;
    },
  },
  {
    name: 'no vignette reread',
    input: {
      text: "what's the answer to this question",
      activity: {
        questionText: 'A 45-year-old man presents with crushing chest pain radiating to the left arm.',
        optionTexts: ['Aspirin', 'Ibuprofen', 'Acetaminophen', 'Naproxen'],
        questionNumber: 1,
        totalQuestions: 10,
        subject: 'Cardiovascular',
        system: 'Cardiovascular',
        difficulty: 'MEDIUM',
        totalAnsweredSoFar: 0,
        correctSoFar: 0,
        hasSelectedAnswer: false,
        currentQuestionCorrect: null,
        selectedOptionText: null,
      },
    },
    check: (r) => (r.reply.includes('crushing chest pain radiating') ? 'reply restates the vignette verbatim' : null),
  },
  {
    name: 'never claims blindness to screen',
    input: {
      text: 'what am I looking at right now',
      activity: {
        questionText: 'A 30-year-old woman with recurrent DVTs and miscarriages.',
        optionTexts: ['Factor V Leiden', 'Antiphospholipid syndrome', 'Protein C deficiency', 'Protein S deficiency'],
        questionNumber: 2,
        totalQuestions: 10,
        subject: 'Hematology',
        system: 'Hematology',
        difficulty: 'HARD',
        totalAnsweredSoFar: 1,
        correctSoFar: 1,
        hasSelectedAnswer: false,
        currentQuestionCorrect: null,
        selectedOptionText: null,
      },
    },
    check: (r) => (/can't see|cannot see|don't have access to your screen|no access to your screen/i.test(r.reply) ? 'reply falsely denies screen access' : null),
  },
  {
    name: 'progress question routes to queryCurriculumProgress tool',
    input: { text: "what's my progress so far, what should I study next" },
    check: (r) => (r.toolCalls.includes('queryCurriculumProgress') ? null : `expected queryCurriculumProgress tool call, got [${r.toolCalls.join(', ')}]`),
  },
  {
    name: 'quiz-history question routes to queryMyAttempts tool',
    input: { text: 'how have I been doing on my practice quizzes lately' },
    check: (r) => (r.toolCalls.includes('queryMyAttempts') ? null : `expected queryMyAttempts tool call, got [${r.toolCalls.join(', ')}]`),
  },
  {
    name: 'ASR phonetic mishearing handled',
    input: { text: 'what is new moan ya' },
    check: (r) => (/pneumonia/i.test(r.reply) ? null : 'reply does not address the intended term "pneumonia"'),
  },
  {
    name: 'jargon term gets a plain-word explanation',
    input: { text: 'what is achalasia' },
    check: (r) => {
      if (!/achalasia/i.test(r.reply)) return 'reply never even names the term';
      // crude: a plain-language gloss should add words beyond just the term itself
      return r.reply.trim().split(/\s+/).length < 8 ? 'reply too short to contain a plain-word explanation' : null;
    },
  },
  {
    name: 'never leads with the correct answer',
    input: {
      text: 'why did I get this wrong',
      activity: {
        questionText: 'A patient in septic shock is given a drug that is first-line pressor therapy.',
        optionTexts: ['Norepinephrine', 'Dopamine', 'Phenylephrine', 'Vasopressin'],
        questionNumber: 3,
        totalQuestions: 10,
        subject: 'Pharmacology',
        system: 'Cardiovascular',
        difficulty: 'HARD',
        totalAnsweredSoFar: 2,
        correctSoFar: 1,
        hasSelectedAnswer: true,
        currentQuestionCorrect: false,
        selectedOptionText: 'Dopamine',
      },
    },
    check: (r) => {
      const firstSentence = (r.reply.split(/(?<=[.!?])\s/)[0] || '').toLowerCase();
      return firstSentence.includes('norepinephrine') ? 'first sentence already names the correct answer instead of reasoning first' : null;
    },
  },
  {
    name: 'lists options inline, comma-separated, not one-per-line',
    input: { text: 'what are the four cardinal signs of inflammation' },
    check: (r) => (/\n\s*[-*•]/.test(r.reply) || (r.reply.match(/\n/g) || []).length > 1 ? 'reply breaks options onto separate lines instead of inline' : null),
  },
  {
    name: 'practice-question request routes to queryQbank tool',
    input: { text: 'give me some practice questions on pharmacology' },
    check: (r) => (r.toolCalls.includes('queryQbank') ? null : `expected queryQbank tool call, got [${r.toolCalls.join(', ')}]`),
  },
  {
    name: 'frequency/weak-area request routes to queryCurriculum tool',
    input: { text: 'what are the most tested diseases in cardiology I should focus on' },
    check: (r) => (r.toolCalls.includes('queryCurriculum') ? null : `expected queryCurriculum tool call, got [${r.toolCalls.join(', ')}]`),
  },
  {
    name: 'off-topic small talk does not waste a book search',
    input: { text: 'good morning, how are you today' },
    check: (r) => (r.toolCalls.includes('searchPathoma') || r.toolCalls.includes('searchFirstAid') ? 'reply called a book-search tool for non-medical small talk' : null),
  },
];

async function main() {
  let passed = 0;
  for (const c of cases) {
    const r = await sendMessage(c.input);
    if (r.status !== 200) {
      console.log(`FAIL  ${c.name}\n      HTTP ${r.status}\n`);
      continue;
    }
    const failure = c.check(r);
    if (failure) {
      console.log(`FAIL  ${c.name}\n      ${failure}\n      reply: ${r.reply.slice(0, 200)}\n`);
    } else {
      passed++;
      console.log(`PASS  ${c.name}`);
    }
  }
  console.log(`\n${passed}/${cases.length} passed`);
}

main();
