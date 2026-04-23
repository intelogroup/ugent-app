const fs = require("fs");
const path = require("path");

function sizeBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeQuestion(base, index) {
  const stem = base.questionStem || base.blob || base.text;
  const explanation = base.explanation || base.blob || stem;
  return {
    _id: `question_${index}`,
    _creationTime: 1710000000000 + index,
    text: stem,
    correctAnswer: "A",
    options: [
      { text: "Answer choice A", isCorrect: true },
      { text: "Answer choice B", isCorrect: false },
      { text: "Answer choice C", isCorrect: false },
      { text: "Answer choice D", isCorrect: false },
    ],
    explanation,
    educationalObjective: explanation.slice(0, 280),
    subject: base.subject || "Behavioral Science",
    system: base.system || "General Principles",
    difficulty: "MEDIUM",
    systemId: "system_general",
    topicId: `topic_${index % 12}`,
    subjectId: "subject_behavioral",
    totalAttempts: 17 + (index % 5),
    correctAttempts: 9 + (index % 3),
    successRate: 61.5,
    avgTimeSpent: 74,
    createdAt: 1710000000000 + index,
    updatedAt: 1710001000000 + index,
  };
}

function makeAnswer(question, index) {
  return {
    _id: `answer_${index}`,
    _creationTime: 1710002000000 + index,
    userId: "user_1",
    testId: "test_1",
    questionId: question._id,
    selectedOptionIndex: index % 4,
    status: index % 3 === 0 ? "CORRECT" : "INCORRECT",
    isCorrect: index % 3 === 0,
    timeSpent: 65 + index,
    answeredAt: 1710003000000 + index,
    markedForReview: false,
    attemptCount: 1,
    lastModified: 1710003000000 + index,
    createdAt: 1710003000000 + index,
    updatedAt: 1710003000000 + index,
  };
}

function makeSession(index) {
  return {
    _id: `session_${index}`,
    _creationTime: 1710004000000 + index,
    userId: "user_1",
    testId: "test_1",
    sessionNumber: index + 1,
    startedAt: 1710004000000 + index,
    pausedAt: index === 0 ? undefined : 1710004500000 + index,
    resumedAt: index === 0 ? undefined : 1710004600000 + index,
    canResume: true,
    resumeDeadline: 1710005000000 + index,
    maxResumeAttempts: 3,
    resumeAttempts: index,
    questionsAnswered: 8 + index,
    correctAnswersCount: 5 + index,
    totalEventCount: 0,
    focusLostCount: 0,
    focusRestoredCount: 0,
    disconnectCount: 0,
    lastActivity: 1710004700000 + index,
    createdAt: 1710004000000 + index,
    updatedAt: 1710004700000 + index,
  };
}

function makeTestBase(questionCount) {
  return {
    _id: "test_1",
    _creationTime: 1710000000000,
    userId: "user_1",
    title: "Test 4/21/2026",
    mode: "TUTOR",
    questionMode: "STANDARD",
    useAI: true,
    totalQuestions: questionCount,
    totalCorrect: Math.floor(questionCount * 0.55),
    totalIncorrect: Math.floor(questionCount * 0.35),
    totalSkipped: questionCount - Math.floor(questionCount * 0.55) - Math.floor(questionCount * 0.35),
    answeredCount: Math.floor(questionCount * 0.9),
    skippedCount: Math.floor(questionCount * 0.1),
    unansweredCount: 0,
    status: "ACTIVE",
    statusUpdatedAt: 1710000000000,
    lastActivityAt: 1710001000000,
    attemptNumber: 1,
    maxAttempts: 1,
    applyIncompletePenalty: false,
    incompletePenalty: 0,
    scoreIncompleteAs: "SKIPPED",
    createdAt: 1710000000000,
    updatedAt: 1710001000000,
  };
}

function makeSystem(index, topicCount) {
  return {
    _id: `system_${index}`,
    _creationTime: 1710000000000 + index,
    name: `System ${index + 1}`,
    description: "Representative system entry used for payload sizing.",
    displayOrder: index + 1,
    questionCount: 120 + index,
    createdAt: 1710000000000 + index,
    updatedAt: 1710001000000 + index,
    topics: Array.from({ length: topicCount }, (_, topicIndex) => ({
      _id: `topic_${index}_${topicIndex}`,
      _creationTime: 1710000000000 + index * 100 + topicIndex,
      name: `Topic ${index + 1}.${topicIndex + 1}`,
      systemId: `system_${index}`,
      description: "Representative topic entry used for payload sizing.",
      displayOrder: topicIndex + 1,
      questionCount: 20 + topicIndex,
      createdAt: 1710000000000 + topicIndex,
      updatedAt: 1710001000000 + topicIndex,
    })),
  };
}

function makePattern(base, index) {
  const text = base.blob || base.questionStem || base.text;
  return {
    _id: `pattern_${index}`,
    _creationTime: 1710000000000 + index,
    questionId: `question_${index}`,
    diseaseName: `Disease ${index % 25}`,
    mechanism: text.slice(0, 180),
    highLeverageClues: [
      text.slice(0, 60),
      text.slice(61, 121),
      text.slice(122, 182),
    ],
    discriminators: [
      { distractor: "Distractor A", ruleOutFact: text.slice(0, 90) },
      { distractor: "Distractor B", ruleOutFact: text.slice(91, 181) },
    ],
    nextBestStep: "Representative next best step",
    clinicalContext: {
      age: "65-year-old",
      gender: "male",
      physiologyState: "postoperative",
      onsetPattern: "acute",
    },
    keySymptoms: ["chest pain", "dyspnea", "weakness"],
    prerequisites: ["physiology", "pathology"],
    topicType: index % 2 === 0 ? "DISEASE" : "CONCEPT",
    createdAt: 1710000000000 + index,
    updatedAt: 1710001000000 + index,
  };
}

function makePatternFrequency(index) {
  return {
    _id: `pf_${index}`,
    _creationTime: 1710000000000 + index,
    type: "DISEASE",
    name: `Disease ${index}`,
    count: 300 - index,
    lastSeenAt: 1710000000000 + index,
  };
}

function main() {
  const jsonPath = path.join(__dirname, "output", "firstaid-questions.json");
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  const questionFixtures = raw.slice(0, 20).map(makeQuestion);
  const answers = questionFixtures.map(makeAnswer);
  const sessions = [makeSession(0), makeSession(1)];
  const testBase = makeTestBase(questionFixtures.length);

  const fullTestQuestions = questionFixtures.map((question, index) => ({
    ...clone(question),
    displayOrder: index + 1,
  }));

  const slimQuizQuestions = questionFixtures.map((question, index) => ({
    _id: question._id,
    text: question.text,
    difficulty: question.difficulty,
    options: question.options,
    displayOrder: index + 1,
  }));

  const createTestOld = {
    testId: "test_1",
    sessionId: "session_1",
    questions: fullTestQuestions,
  };

  const createTestNew = {
    testId: "test_1",
    sessionId: "session_1",
  };

  const getTestByIdCurrent = {
    ...clone(testBase),
    questions: fullTestQuestions,
    answers,
    sessions,
  };

  const getQuizById = {
    _id: testBase._id,
    title: testBase.title,
    questionMode: testBase.questionMode,
    totalCorrect: testBase.totalCorrect,
    totalIncorrect: testBase.totalIncorrect,
    questions: slimQuizQuestions,
  };

  const getTestStatusById = {
    _id: testBase._id,
    userId: testBase.userId,
    status: testBase.status,
    lastActivityAt: testBase.lastActivityAt,
    pausedAt: testBase.pausedAt,
    completedAt: testBase.completedAt,
    answeredCount: testBase.answeredCount,
    totalCorrect: testBase.totalCorrect,
    totalSkipped: testBase.totalSkipped,
    score: testBase.score,
    lastSession: sessions[0],
  };

  const listSystemsWithTopics = Array.from({ length: 12 }, (_, index) => makeSystem(index, 8));
  const listSystemsWithTopicsSlim = listSystemsWithTopics.map((system) => ({
    _id: system._id,
    name: system.name,
    questionCount: system.questionCount,
    topics: system.topics.map((topic) => ({
      _id: topic._id,
      name: topic.name,
      questionCount: topic.questionCount,
    })),
  }));
  const strategyPatterns = raw.slice(0, 200).map(makePattern);
  const diseaseFrequencies = Array.from({ length: 120 }, (_, index) => makePatternFrequency(index));

  const getDiseasePriorityListOutput = diseaseFrequencies.slice(0, 30).map((row, index) => ({
    diseaseName: row.name,
    topicType: index % 2 === 0 ? "DISEASE" : "CONCEPT",
    topClue: strategyPatterns[index].highLeverageClues[0],
    frequency: row.count,
    userSuccessRate: 45 + (index % 20),
    priorityScore: row.count * 0.42,
  }));

  const getMostConfusableTopicsOutput = diseaseFrequencies.slice(0, 8).map((row, index) => ({
    diseaseName: row.name,
    discriminatorCount: 40 - index,
    topicType: index % 2 === 0 ? "DISEASE" : "CONCEPT",
  }));

  const getExtractionFeedOutput = strategyPatterns.slice(0, 50).map((pattern, index) => ({
    ...pattern,
    questionText: questionFixtures[index % questionFixtures.length].text,
  }));
  const getExtractionFeedSlim = strategyPatterns.slice(0, 50).map((pattern, index) => ({
    _id: pattern._id,
    questionId: questionFixtures[index % questionFixtures.length]._id,
    diseaseName: pattern.diseaseName,
    mechanism: pattern.mechanism,
    keySymptoms: pattern.keySymptoms,
    clinicalContext: pattern.clinicalContext,
  }));
  const getQuestionExplanationById = {
    _id: questionFixtures[0]._id,
    explanation: questionFixtures[0].explanation,
  };
  const getQuestionTextById = {
    _id: questionFixtures[0]._id,
    text: questionFixtures[0].text,
  };

  const results = [
    {
      name: "getExtractionFeed current(limit=50)",
      bytes: sizeBytes(getExtractionFeedOutput),
      note: "Previous broad feed shape",
    },
    {
      name: "getExtractionFeed slim(limit=50)",
      bytes: sizeBytes(getExtractionFeedSlim),
      note: "Current feed shape after trimming unused fields",
    },
    {
      name: "getTestById current (20 questions, 20 answers, 2 sessions)",
      bytes: sizeBytes(getTestByIdCurrent),
      note: "Current live quiz payload before slimming",
    },
    {
      name: "listSystemsWithTopics current (12 systems x 8 topics)",
      bytes: sizeBytes(listSystemsWithTopics),
      note: "Previous broad reference-data shape",
    },
    {
      name: "listSystemsWithTopics slim (12 systems x 8 topics)",
      bytes: sizeBytes(listSystemsWithTopicsSlim),
      note: "Current shape after dropping unused metadata",
    },
    {
      name: "createTest old mutation return (20 questions)",
      bytes: sizeBytes(createTestOld),
      note: "Returned on each test creation before patch",
    },
    {
      name: "getQuizById slim (20 questions)",
      bytes: sizeBytes(getQuizById),
      note: "Current live quiz payload after patch",
    },
    {
      name: "getQuestionTextById on reveal",
      bytes: sizeBytes(getQuestionTextById),
      note: "On-demand clue-training full stem payload",
    },
    {
      name: "getDiseasePriorityList output (30 rows)",
      bytes: sizeBytes(getDiseasePriorityListOutput),
      note: "Output is moderate; server work is the larger problem",
    },
    {
      name: "getMostConfusableTopics output (8 rows)",
      bytes: sizeBytes(getMostConfusableTopicsOutput),
      note: "Small payload; computation cost dominates",
    },
    {
      name: "getTestStatusById slim",
      bytes: sizeBytes(getTestStatusById),
      note: "Current status check payload after patch",
    },
    {
      name: "getQuestionExplanationById on submit",
      bytes: sizeBytes(getQuestionExplanationById),
      note: "On-demand quiz explanation payload",
    },
    {
      name: "createTest new mutation return",
      bytes: sizeBytes(createTestNew),
      note: "Current create-test response after patch",
    },
  ].sort((a, b) => b.bytes - a.bytes);

  console.log("Convex bandwidth dry-run");
  console.log("========================");
  console.log(`Fixture source: ${path.relative(process.cwd(), jsonPath)} (${raw.length} local parsed questions)`);
  console.log("");

  for (const [index, result] of results.entries()) {
    console.log(
      `${index + 1}. ${result.name}: ${formatBytes(result.bytes)} (${result.bytes.toLocaleString()} bytes)`
    );
    console.log(`   ${result.note}`);
  }

  const oldCreateBytes = sizeBytes(createTestOld);
  const newCreateBytes = sizeBytes(createTestNew);
  const oldQuizBytes = sizeBytes(getTestByIdCurrent);
  const newQuizBytes = sizeBytes(getQuizById);
  const oldFeedBytes = sizeBytes(getExtractionFeedOutput);
  const newFeedBytes = sizeBytes(getExtractionFeedSlim);
  const oldSystemsBytes = sizeBytes(listSystemsWithTopics);
  const newSystemsBytes = sizeBytes(listSystemsWithTopicsSlim);

  console.log("");
  console.log("Patch impact");
  console.log("------------");
  console.log(
    `createTest response: ${formatBytes(oldCreateBytes)} -> ${formatBytes(newCreateBytes)} (${Math.round(((oldCreateBytes - newCreateBytes) / oldCreateBytes) * 100)}% smaller)`
  );
  console.log(
    `quiz live query: ${formatBytes(oldQuizBytes)} -> ${formatBytes(newQuizBytes)} (${Math.round(((oldQuizBytes - newQuizBytes) / oldQuizBytes) * 100)}% smaller)`
  );
  console.log(
    `extraction feed: ${formatBytes(oldFeedBytes)} -> ${formatBytes(newFeedBytes)} (${Math.round(((oldFeedBytes - newFeedBytes) / oldFeedBytes) * 100)}% smaller)`
  );
  console.log(
    `systems/topics reference data: ${formatBytes(oldSystemsBytes)} -> ${formatBytes(newSystemsBytes)} (${Math.round(((oldSystemsBytes - newSystemsBytes) / oldSystemsBytes) * 100)}% smaller)`
  );
}

main();
