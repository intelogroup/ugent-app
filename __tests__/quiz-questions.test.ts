/**
 * Integration test for quiz question availability
 * Tests that questions are properly fetched and displayed in quizzes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Quiz Questions Availability', () => {
  let testUserId: string;
  let subjectIds: string[];
  let systemIds: string[];
  let topicIds: string[];

  beforeAll(async () => {
    // Get or create a test user
    const testUser = await prisma.user.findFirst({
      where: { email: { contains: '@' } },
    });

    if (!testUser) {
      throw new Error('No users found in database. Please create a user first.');
    }

    testUserId = testUser.id;

    // Get available subjects, systems, and topics
    const subjects = await prisma.subject.findMany({
      where: { questionCount: { gt: 0 } },
      select: { id: true },
    });

    const systems = await prisma.system.findMany({
      where: { questionCount: { gt: 0 } },
      select: { id: true },
    });

    const topics = await prisma.topic.findMany({
      where: { questionCount: { gt: 0 } },
      select: { id: true },
    });

    subjectIds = subjects.map(s => s.id);
    systemIds = systems.map(s => s.id);
    topicIds = topics.map(t => t.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Questions', () => {
    test('should have questions in database', async () => {
      const questionCount = await prisma.question.count();
      expect(questionCount).toBeGreaterThan(0);
    });

    test('should have questions with answer options', async () => {
      const questionsWithOptions = await prisma.question.findMany({
        include: { options: true },
        take: 10,
      });

      expect(questionsWithOptions.length).toBeGreaterThan(0);
      questionsWithOptions.forEach(question => {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
      });
    });

    test('should have questions with subjects', async () => {
      const questionsWithSubjects = await prisma.question.count({
        where: { subjectId: { not: null } },
      });

      expect(questionsWithSubjects).toBeGreaterThan(0);
    });

    test('should have subjects with question counts', async () => {
      const subjects = await prisma.subject.findMany({
        where: { questionCount: { gt: 0 } },
      });

      expect(subjects.length).toBeGreaterThan(0);
      subjects.forEach(subject => {
        expect(subject.questionCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Question Selection Logic', () => {
    test('should select questions by subject only', async () => {
      if (subjectIds.length === 0) {
        console.warn('No subjects with questions found, skipping test');
        return;
      }

      const selectedSubjects = subjectIds.slice(0, 1);
      const questions = await prisma.question.findMany({
        where: { subjectId: { in: selectedSubjects } },
        include: { options: true },
        take: 10,
      });

      expect(questions.length).toBeGreaterThan(0);
      questions.forEach(q => {
        expect(selectedSubjects).toContain(q.subjectId);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
      });
    });

    test('should select questions by topic only', async () => {
      if (topicIds.length === 0) {
        console.warn('No topics with questions found, skipping test');
        return;
      }

      const selectedTopics = topicIds.slice(0, 1);
      const questions = await prisma.question.findMany({
        where: { topicId: { in: selectedTopics } },
        include: { options: true },
        take: 10,
      });

      expect(questions.length).toBeGreaterThan(0);
      questions.forEach(q => {
        expect(selectedTopics).toContain(q.topicId);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
      });
    });

    test('should select questions by system only', async () => {
      if (systemIds.length === 0) {
        console.warn('No systems with questions found, skipping test');
        return;
      }

      const selectedSystems = systemIds.slice(0, 1);
      const questions = await prisma.question.findMany({
        where: { systemId: { in: selectedSystems } },
        include: { options: true },
        take: 10,
      });

      expect(questions.length).toBeGreaterThan(0);
      questions.forEach(q => {
        expect(selectedSystems).toContain(q.systemId);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
      });
    });

    test('should allow creating test with subjects OR topics (not requiring both)', async () => {
      // Test with subjects only
      if (subjectIds.length > 0) {
        const filter: any = { subjectId: { in: subjectIds.slice(0, 1) } };
        const questions = await prisma.question.findMany({
          where: filter,
          take: 5,
        });
        expect(questions.length).toBeGreaterThan(0);
      }

      // Test with topics only
      if (topicIds.length > 0) {
        const filter: any = { topicId: { in: topicIds.slice(0, 1) } };
        const questions = await prisma.question.findMany({
          where: filter,
          take: 5,
        });
        expect(questions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Test Creation', () => {
    test('should create test with questions from subjects', async () => {
      if (subjectIds.length === 0) {
        console.warn('No subjects with questions found, skipping test');
        return;
      }

      const selectedSubjects = subjectIds.slice(0, 1);
      const questionCount = 5;

      // Fetch available questions
      const availableQuestions = await prisma.question.findMany({
        where: { subjectId: { in: selectedSubjects } },
        take: questionCount * 2,
        include: { options: true },
      });

      expect(availableQuestions.length).toBeGreaterThanOrEqual(questionCount);

      // Create test
      const test = await prisma.test.create({
        data: {
          userId: testUserId,
          title: 'Test Quiz - Jest',
          mode: 'TUTOR',
          questionMode: 'STANDARD',
          useAI: false,
          totalQuestions: questionCount,
          selectedSubjects: selectedSubjects,
          selectedTopics: [],
        },
      });

      expect(test).toBeDefined();
      expect(test.id).toBeDefined();

      // Associate questions with test
      const selectedQuestions = availableQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, questionCount);

      await Promise.all(
        selectedQuestions.map((question, index) =>
          prisma.testQuestion.create({
            data: {
              testId: test.id,
              questionId: question.id,
              displayOrder: index + 1,
            },
          })
        )
      );

      // Verify test questions were created
      const testQuestions = await prisma.testQuestion.findMany({
        where: { testId: test.id },
        include: {
          question: {
            include: { options: true },
          },
        },
      });

      expect(testQuestions.length).toBe(questionCount);
      testQuestions.forEach(tq => {
        expect(tq.question.options.length).toBeGreaterThanOrEqual(2);
      });

      // Cleanup - delete test
      await prisma.testQuestion.deleteMany({ where: { testId: test.id } });
      await prisma.test.delete({ where: { id: test.id } });
    });

    test('should create test with questions from topics', async () => {
      if (topicIds.length === 0) {
        console.warn('No topics with questions found, skipping test');
        return;
      }

      const selectedTopics = topicIds.slice(0, 1);
      const questionCount = 5;

      // Fetch available questions
      const availableQuestions = await prisma.question.findMany({
        where: { topicId: { in: selectedTopics } },
        take: questionCount * 2,
        include: { options: true },
      });

      expect(availableQuestions.length).toBeGreaterThanOrEqual(questionCount);

      // Create test
      const test = await prisma.test.create({
        data: {
          userId: testUserId,
          title: 'Test Quiz - Jest (Topics)',
          mode: 'TUTOR',
          questionMode: 'STANDARD',
          useAI: false,
          totalQuestions: questionCount,
          selectedSubjects: [],
          selectedTopics: selectedTopics,
        },
      });

      expect(test).toBeDefined();

      // Associate questions with test
      const selectedQuestions = availableQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, questionCount);

      await Promise.all(
        selectedQuestions.map((question, index) =>
          prisma.testQuestion.create({
            data: {
              testId: test.id,
              questionId: question.id,
              displayOrder: index + 1,
            },
          })
        )
      );

      // Verify test questions
      const testQuestions = await prisma.testQuestion.findMany({
        where: { testId: test.id },
        include: {
          question: {
            include: { options: true },
          },
        },
      });

      expect(testQuestions.length).toBe(questionCount);

      // Cleanup
      await prisma.testQuestion.deleteMany({ where: { testId: test.id } });
      await prisma.test.delete({ where: { id: test.id } });
    });
  });

  describe('Quiz Display Requirements', () => {
    test('questions should have all required fields for display', async () => {
      const questions = await prisma.question.findMany({
        include: { options: true },
        take: 10,
      });

      questions.forEach(question => {
        // Required fields for quiz display
        expect(question.id).toBeDefined();
        expect(question.text).toBeDefined();
        expect(question.text.length).toBeGreaterThan(0);
        expect(question.difficulty).toBeDefined();
        expect(['EASY', 'MEDIUM', 'HARD']).toContain(question.difficulty);

        // Options validation
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.options.length).toBeLessThanOrEqual(10);

        question.options.forEach(option => {
          expect(option.id).toBeDefined();
          expect(option.text).toBeDefined();
          expect(option.text.length).toBeGreaterThan(0);
          expect(option.displayOrder).toBeGreaterThanOrEqual(0);
          expect(typeof option.isCorrect).toBe('boolean');
        });

        // At least one correct answer
        const correctAnswers = question.options.filter(o => o.isCorrect);
        expect(correctAnswers.length).toBeGreaterThanOrEqual(1);
      });
    });

    test('options should have proper display order', async () => {
      const questions = await prisma.question.findMany({
        include: {
          options: {
            orderBy: { displayOrder: 'asc' }
          }
        },
        take: 10,
      });

      questions.forEach(question => {
        const orders = question.options.map(o => o.displayOrder);
        // Check that display orders are sequential starting from 0
        expect(orders).toEqual([...Array(orders.length).keys()]);
      });
    });
  });
});
