import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockHandleAuth = vi.fn();

vi.mock('@workos-inc/authkit-nextjs', () => ({
  handleAuth: mockHandleAuth,
}));

describe('callback route', () => {
  beforeEach(() => {
    vi.resetModules();
    mockHandleAuth.mockReset();
  });

  it('redirects to login when code is missing', async () => {
    mockHandleAuth.mockReturnValue(async () => new Response(null, { status: 204 }));

    const { GET } = await import('@/app/callback/route');
    const response = await GET(new NextRequest('https://ugent-app.vercel.app/callback'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://ugent-app.vercel.app/login?error=missing_code');
  });

  it('passes valid callback requests to AuthKit', async () => {
    const authResponse = new Response(null, {
      status: 307,
      headers: { location: 'https://ugent-app.vercel.app/dashboard' },
    });
    mockHandleAuth.mockReturnValue(async () => authResponse);

    const { GET } = await import('@/app/callback/route');
    const response = await GET(
      new NextRequest('https://ugent-app.vercel.app/callback?code=valid_code_abc')
    );

    expect(response).toBe(authResponse);
  });

  it('redirects to login when AuthKit raises a callback error', async () => {
    mockHandleAuth.mockImplementation(({ onError }) => {
      return async (request: NextRequest) => onError({ request, error: new Error('boom') });
    });

    const { GET } = await import('@/app/callback/route');
    const response = await GET(
      new NextRequest('https://ugent-app.vercel.app/callback?code=bad_code')
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://ugent-app.vercel.app/login?error=auth_callback_failed'
    );
  });
});
