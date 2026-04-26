import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockWithAuth = vi.fn();
const mockGetSignInUrl = vi.fn();
const mockGetSignUpUrl = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock('@workos-inc/authkit-nextjs', () => ({
  withAuth: mockWithAuth,
  getSignInUrl: mockGetSignInUrl,
  getSignUpUrl: mockGetSignUpUrl,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

describe('Auth pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithAuth.mockResolvedValue({ user: null, accessToken: null });
    mockGetSignInUrl.mockResolvedValue('https://auth.workos.com/sign-in');
    mockGetSignUpUrl.mockResolvedValue('https://auth.workos.com/sign-up');
  });

  it('login page renders inline email/password auth with fallback WorkOS link', async () => {
    const { default: LoginPage } = await import('@/app/login/page');

    render(await LoginPage());

    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in another way' })).toHaveAttribute(
      'href',
      'https://auth.workos.com/sign-in'
    );
  });

  it('signup page renders inline email/password auth with verification copy', async () => {
    const { default: SignupPage } = await import('@/app/signup/page');

    render(await SignupPage());

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('minLength', '8');
    expect(screen.getByText(/send a verification email/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Use WorkOS hosted sign up' })).toHaveAttribute(
      'href',
      'https://auth.workos.com/sign-up'
    );
  });

  it('login page redirects authenticated users to dashboard', async () => {
    mockWithAuth.mockResolvedValueOnce({
      user: { id: 'user_01', email: 'test@example.com' },
      accessToken: 'tok_123',
    });

    const { default: LoginPage } = await import('@/app/login/page');

    await expect(LoginPage()).rejects.toThrow('REDIRECT:/dashboard');
  });
});
