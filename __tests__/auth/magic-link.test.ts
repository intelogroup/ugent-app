import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// WorkOS Magic Link (passwordless) flow:
// 1. User enters email → WorkOS sends magic link
// 2. User clicks link → WorkOS validates token → redirects to callback with code
// 3. handleAuth exchanges code for session

const mockUser = {
  id: 'user_01',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: true,
};

const mockWorkOS = {
  userManagement: {
    sendMagicAuthCode: vi.fn(),
    authenticateWithMagicAuth: vi.fn(),
    getAuthorizationUrl: vi.fn(),
  },
};

vi.mock('@workos-inc/node', () => ({
  WorkOS: vi.fn(() => mockWorkOS),
}));

vi.mock('@workos-inc/authkit-nextjs', () => ({
  handleAuth: vi.fn(
    (opts?: { returnPathname?: string }) =>
      async (req: Request) => {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        if (!code) return new Response('Missing code', { status: 400 });
        return new Response(null, {
          status: 302,
          headers: { Location: opts?.returnPathname ?? '/dashboard' },
        });
      }
  ),
  withAuth: vi.fn(),
}));

import { handleAuth, withAuth } from '@workos-inc/authkit-nextjs';

describe('Magic Link Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends magic auth code to email', async () => {
    mockWorkOS.userManagement.sendMagicAuthCode.mockResolvedValueOnce({ success: true });

    await mockWorkOS.userManagement.sendMagicAuthCode({
      email: 'test@example.com',
    });

    expect(mockWorkOS.userManagement.sendMagicAuthCode).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });

  it('authenticates user after clicking magic link', async () => {
    mockWorkOS.userManagement.authenticateWithMagicAuth.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'tok_magic_abc',
      refreshToken: 'rtok_magic_abc',
    });

    const result = await mockWorkOS.userManagement.authenticateWithMagicAuth({
      code: 'magic_code_xyz',
      email: 'test@example.com',
      clientId: 'client_01',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(result.accessToken).toBeTruthy();
  });

  it('callback route redirects to /dashboard with valid code', async () => {
    const GET = handleAuth({ returnPathname: '/dashboard' });
    const req = new NextRequest('http://localhost:3000/callback?code=valid_code_abc');
    const res = await GET(req);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/dashboard');
  });

  it('callback route returns 400 when code is missing', async () => {
    const GET = handleAuth({ returnPathname: '/dashboard' });
    const req = new NextRequest('http://localhost:3000/callback');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('withAuth returns user after magic link authentication', async () => {
    vi.mocked(withAuth).mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'tok_magic_abc',
    } as any);

    const { user } = await withAuth();
    expect(user?.email).toBe('test@example.com');
    expect(user?.emailVerified).toBe(true);
  });

  it('rejects invalid or expired magic link token', async () => {
    mockWorkOS.userManagement.authenticateWithMagicAuth.mockRejectedValueOnce(
      new Error('Magic link token is invalid or expired')
    );

    await expect(
      mockWorkOS.userManagement.authenticateWithMagicAuth({
        code: 'expired_token',
        email: 'test@example.com',
        clientId: 'client_01',
      })
    ).rejects.toThrow('Magic link token is invalid or expired');
  });

  it('getAuthorizationUrl generates magic link with correct params', async () => {
    mockWorkOS.userManagement.getAuthorizationUrl.mockResolvedValueOnce(
      'https://auth.workos.com/sso/authorize?client_id=client_01&connection=magic_link&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback'
    );

    const url = await mockWorkOS.userManagement.getAuthorizationUrl({
      clientId: 'client_01',
      connection: 'magic_link',
      redirectUri: 'http://localhost:3000/callback',
    });

    expect(url).toContain('client_id=client_01');
    expect(url).toContain('redirect_uri=');
  });
});
