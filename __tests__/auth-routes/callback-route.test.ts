/**
 * @jest-environment node
 */
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string) => ({ status: 307, headers: { location: url } }),
  },
}));

const exchangeCodeForSession = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession },
  }),
}));

import { GET as getImpl } from '@/app/auth/callback/route';
const GET = getImpl as unknown as (req: Request) => Promise<{ headers: { location: string } }>;

function fakeRequest(url: string) {
  return { url } as Request;
}

describe('GET /auth/callback', () => {
  afterEach(() => jest.clearAllMocks());

  it('redirects to next path on successful code exchange', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(fakeRequest('https://app.test/auth/callback?code=abc&next=/curriculum'));
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(res.headers.location).toBe('https://app.test/curriculum');
  });

  it('defaults to /dashboard when no next param given', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(fakeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.location).toBe('https://app.test/dashboard');
  });

  it('redirects to login with error when exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' } });
    const res = await GET(fakeRequest('https://app.test/auth/callback?code=abc'));
    expect(res.headers.location).toBe('https://app.test/auth/login?error=auth_failed');
  });

  it('redirects to login with error when no code param given', async () => {
    const res = await GET(fakeRequest('https://app.test/auth/callback'));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.location).toBe('https://app.test/auth/login?error=auth_failed');
  });
});
