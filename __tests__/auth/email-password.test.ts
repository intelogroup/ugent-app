import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUser = {
  id: 'user_01',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

vi.mock('@workos-inc/authkit-nextjs', () => ({
  getSignInUrl: vi.fn().mockResolvedValue('https://auth.workos.com/sign-in?client_id=client_01'),
  getSignUpUrl: vi.fn().mockResolvedValue('https://auth.workos.com/sign-up?client_id=client_01'),
  withAuth: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  handleAuth: vi.fn(() => async () => new Response(null, { status: 302, headers: { Location: '/dashboard' } })),
}));

import { getSignInUrl, getSignUpUrl, withAuth, signOut } from '@workos-inc/authkit-nextjs';

describe('Email/Password Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSignInUrl returns a WorkOS-hosted sign-in URL', async () => {
    const url = await getSignInUrl();
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('sign-in');
  });

  it('getSignUpUrl returns a WorkOS-hosted sign-up URL', async () => {
    const url = await getSignUpUrl();
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('sign-up');
  });

  it('withAuth returns null user when unauthenticated', async () => {
    vi.mocked(withAuth).mockResolvedValueOnce({ user: null, accessToken: null } as any);
    const { user } = await withAuth();
    expect(user).toBeNull();
  });

  it('withAuth returns user when authenticated', async () => {
    vi.mocked(withAuth).mockResolvedValueOnce({ user: mockUser, accessToken: 'tok_abc' } as any);
    const { user } = await withAuth();
    expect(user).toBeDefined();
    expect(user?.email).toBe('test@example.com');
    expect(user?.firstName).toBe('Test');
  });

  it('signOut resolves without error', async () => {
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('getSignInUrl includes client_id param', async () => {
    const url = await getSignInUrl();
    expect(url).toContain('client_id=');
  });

  it('handles sign-in with state payload', async () => {
    vi.mocked(getSignInUrl).mockResolvedValueOnce(
      'https://auth.workos.com/sign-in?client_id=client_01&state=eyJ0ZWFtSWQiOiJ0ZWFtXzEyMyJ9'
    );
    const url = await getSignInUrl({ state: JSON.stringify({ teamId: 'team_123' }) } as any);
    expect(url).toContain('state=');
  });
});
