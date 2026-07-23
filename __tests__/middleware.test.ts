/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

let mockUser: { email_confirmed_at?: string } | null = null;

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
  }),
}));

import { proxy as middleware } from '@/proxy';

function req(path: string) {
  return new NextRequest(new URL(path, 'https://app.test'));
}

describe('middleware', () => {
  beforeEach(() => {
    mockUser = null;
  });

  it('redirects unauthenticated users away from protected routes, preserving the target as ?redirect=', async () => {
    const res = await middleware(req('/dashboard'));
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/auth/login');
    expect(location.searchParams.get('redirect')).toBe('/dashboard');
  });

  it('lets unauthenticated users through to public routes', async () => {
    const res = await middleware(req('/'));
    expect(res.status).not.toBe(307);
  });

  it('blocks unverified users from protected routes with error=email_unverified', async () => {
    mockUser = { email_confirmed_at: undefined };
    const res = await middleware(req('/quiz'));
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/auth/login');
    expect(location.searchParams.get('error')).toBe('email_unverified');
  });

  it('lets verified users through to protected routes', async () => {
    mockUser = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    const res = await middleware(req('/dashboard'));
    expect(res.status).not.toBe(307);
  });

  it('redirects verified, signed-in users away from /auth/login to /dashboard', async () => {
    mockUser = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    const res = await middleware(req('/auth/login'));
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard');
  });

  it('redirects verified, signed-in users away from /auth/signup to /dashboard', async () => {
    mockUser = { email_confirmed_at: '2026-01-01T00:00:00Z' };
    const res = await middleware(req('/auth/signup'));
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard');
  });

  it('leaves unverified users free to view /auth/login (not stuck in a redirect loop)', async () => {
    mockUser = { email_confirmed_at: undefined };
    const res = await middleware(req('/auth/login'));
    expect(res.status).not.toBe(307);
  });
});
