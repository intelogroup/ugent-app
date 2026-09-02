const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // double-metaphone is ESM-only; Jest can't eval it.
    '^double-metaphone$': '<rootDir>/__tests__/__mocks__/double-metaphone.ts',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/quiz-questions.test.ts',
    '<rootDir>/__tests__/__mocks__/',
    // vitest-authored tests (use vi.mock/vi.fn) — run these via `npx vitest run <path>`, not jest
    '<rootDir>/__tests__/api/quiz-activity.test.ts',
    '<rootDir>/__tests__/lib/supabase/queries.test.ts',
    // ai-sdk ESM fails to load under Jest (Node 24 CJS interop) — 0 tests run.
    // Pass under vitest; run via `npm run test:ai`.
    '<rootDir>/__tests__/components/CleaChat.test.tsx',
    '<rootDir>/__tests__/lib/clea-agent-context.test.tsx',
    '<rootDir>/__tests__/lib/clea-tools.test.ts',
    '<rootDir>/__tests__/lib/agent-error-logger.test.ts',
    // vitest-authored lifecycle/integration tests
    '<rootDir>/__tests__/lib/assumptions-',
    '<rootDir>/__tests__/lib/data-lifecycle.test.ts',
    '<rootDir>/__tests__/lib/curriculum-analyzer.test.ts',
    '<rootDir>/__tests__/lib/curriculum-generator.test.ts',
    '<rootDir>/__tests__/lib/llm-fallback.test.ts',
    '<rootDir>/__tests__/lib/asr-correct.test.ts',
    '<rootDir>/__tests__/lib/topic-router.test.ts',
    '<rootDir>/e2e/',
    '<rootDir>/tests/',
    '<rootDir>/.claude/worktrees/',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/layout.tsx',
    '!app/**/loading.tsx',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
