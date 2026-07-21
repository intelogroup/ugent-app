/**
 * @jest-environment node
 */
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => ({ status: 307, headers: { location: url.toString() } }),
  },
}));

const verifyOtp = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { verifyOtp },
  }),
}));

import { GET as getImpl } from '@/app/auth/confirm/route';
const GET = getImpl as unknown as (req: any) => Promise<{ headers: { location: string } }>;

function fakeRequest(url: string) {
  return { url } as any;
}

describe('GET /auth/confirm', () => {
  afterEach(() => jest.clearAllMocks());

  it('redirects to next path on successful otp verification', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const res = await GET(fakeRequest('https://app.test/auth/confirm?token_hash=xyz&type=email&next=/curriculum'));
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'xyz' });
    expect(res.headers.location).toBe('https://app.test/curriculum');
  });

  it('defaults to /dashboard when no next param given', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const res = await GET(fakeRequest('https://app.test/auth/confirm?token_hash=xyz&type=email'));
    expect(res.headers.location).toBe('https://app.test/dashboard');
  });

  it('redirects to login with error when verification fails', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'expired' } });
    const res = await GET(fakeRequest('https://app.test/auth/confirm?token_hash=xyz&type=email'));
    expect(res.headers.location).toBe('https://app.test/auth/login?error=verification_failed');
  });

  it('redirects to login with error when token_hash or type is missing', async () => {
    const res = await GET(fakeRequest('https://app.test/auth/confirm?type=email'));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.location).toBe('https://app.test/auth/login?error=verification_failed');
  });
});
