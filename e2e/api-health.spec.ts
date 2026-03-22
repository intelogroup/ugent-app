import { test, expect } from '@playwright/test';

/**
 * API Endpoint Health Checks
 * Verifies all route.ts endpoints respond (auth errors 401/403 are OK, 500 is not)
 */

const API_ENDPOINTS = [
  // Tests
  { path: '/api/tests/create', method: 'POST', name: 'Tests: Create' },
  { path: '/api/tests/list', method: 'GET', name: 'Tests: List' },
  { path: '/api/tests/submit-answer', method: 'POST', name: 'Tests: Submit Answer' },
  // Progress
  { path: '/api/progress', method: 'GET', name: 'Progress' },
  // Achievements
  { path: '/api/achievements', method: 'GET', name: 'Achievements' },
  // Leaderboard
  { path: '/api/leaderboard', method: 'GET', name: 'Leaderboard' },
  { path: '/api/leaderboard/me', method: 'GET', name: 'Leaderboard: Me' },
  // Insights
  { path: '/api/insights', method: 'GET', name: 'Insights' },
  { path: '/api/insights/recommendations', method: 'GET', name: 'Insights: Recommendations' },
  // Search
  { path: '/api/search/questions', method: 'GET', name: 'Search: Questions' },
  { path: '/api/search/users', method: 'GET', name: 'Search: Users' },
  // Notes
  { path: '/api/notes', method: 'GET', name: 'Notes' },
  // Messages
  { path: '/api/messages', method: 'GET', name: 'Messages' },
  { path: '/api/messages/conversations', method: 'GET', name: 'Messages: Conversations' },
];

test.describe('API Endpoint Health', () => {
  test('all API endpoints respond (not 500)', async ({ request }) => {
    const results: { name: string; status: number; ok: boolean }[] = [];

    for (const endpoint of API_ENDPOINTS) {
      try {
        const response = await request.fetch(`http://localhost:3000${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
        });

        const ok = response.status() < 500;
        results.push({ name: endpoint.name, status: response.status(), ok });
        console.log(`${ok ? '✅' : '❌'} ${endpoint.name}: ${response.status()}`);
      } catch (err) {
        results.push({ name: endpoint.name, status: 0, ok: false });
        console.log(`❌ ${endpoint.name}: Network error`);
      }
    }

    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      console.log(`\n⚠️  ${failed.length} endpoints returned 5xx:`);
      failed.forEach(f => console.log(`   - ${f.name}: ${f.status}`));
    }

    expect(failed.length).toBe(0);
  });

  test('admin endpoints are protected (require auth)', async ({ request }) => {
    const adminEndpoints = [
      '/api/admin/users',
      '/api/admin/analytics',
      '/api/admin/questions',
    ];

    for (const path of adminEndpoints) {
      const response = await request.get(`http://localhost:3000${path}`);
      // Admin endpoints must require auth
      expect(response.status()).toBeGreaterThanOrEqual(400);
      console.log(`✅ ${path}: Protected (${response.status()})`);
    }
  });
});
