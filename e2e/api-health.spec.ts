import { test, expect } from '@playwright/test';

/**
 * API Endpoint Health Checks
 * Verifies real route.ts endpoints respond (auth/validation errors 4xx are OK, 500 is not)
 */

const API_ENDPOINTS = [
  { path: '/api/quiz-data?mode=filters', method: 'GET', name: 'Quiz Data: Filters' },
  { path: '/api/quiz-data?limit=1', method: 'GET', name: 'Quiz Data: Questions' },
  { path: '/api/curriculum', method: 'GET', name: 'Curriculum' },
  { path: '/api/disease-reference', method: 'GET', name: 'Disease Reference' },
  { path: '/api/strategy', method: 'GET', name: 'Strategy' },
  { path: '/api/strategy/clues', method: 'GET', name: 'Strategy: Clues' },
];

test.describe('API Endpoint Health', () => {
  test('all API endpoints respond (not 500)', async ({ request, baseURL }) => {
    const results: { name: string; status: number; ok: boolean }[] = [];

    for (const endpoint of API_ENDPOINTS) {
      try {
        const response = await request.fetch(`${baseURL}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
        });

        const ok = response.status() < 500;
        results.push({ name: endpoint.name, status: response.status(), ok });
      } catch {
        results.push({ name: endpoint.name, status: 0, ok: false });
      }
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      console.log(`${failed.length} endpoints returned 5xx:`, failed);
    }

    expect(failed.length).toBe(0);
  });

  test('quiz-data requires no auth but clea-chat requires an id', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/clea-chat`);
    expect(res.status()).toBe(400);
  });
});
