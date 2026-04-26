import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateWithPassword = vi.fn();
const mockCreateUser = vi.fn();
const mockSendVerificationEmail = vi.fn();
const mockSaveSession = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const MockWorkOS = vi.fn(function MockWorkOS() {
  return {
    userManagement: {
      authenticateWithPassword: mockAuthenticateWithPassword,
      createUser: mockCreateUser,
      sendVerificationEmail: mockSendVerificationEmail,
    },
  };
});

vi.mock('@workos-inc/node', () => ({
  WorkOS: MockWorkOS,
}));

vi.mock('@workos-inc/authkit-nextjs', () => ({
  saveSession: mockSaveSession,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

describe('Email/Password Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WORKOS_API_KEY = 'sk_test_123';
    process.env.WORKOS_CLIENT_ID = 'client_123';
    process.env.APP_URL = 'http://localhost:3000';
  });

  it('signIn authenticates, saves session, and redirects to dashboard', async () => {
    mockAuthenticateWithPassword.mockResolvedValueOnce({
      user: { id: 'user_01', email: 'test@example.com' },
      accessToken: 'access_123',
      refreshToken: 'refresh_123',
    });

    const { signIn } = await import('@/app/actions/auth');
    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'password123');

    await expect(signIn({}, formData)).rejects.toThrow('REDIRECT:/dashboard');

    expect(mockAuthenticateWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      clientId: 'client_123',
    });
    expect(mockSaveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'access_123',
        refreshToken: 'refresh_123',
      }),
      'http://localhost:3000'
    );
  });

  it('signIn maps invalid credentials to a form error', async () => {
    mockAuthenticateWithPassword.mockRejectedValueOnce({ code: 'invalid_credentials' });

    const { signIn } = await import('@/app/actions/auth');
    const formData = new FormData();
    formData.set('email', 'wrong@example.com');
    formData.set('password', 'wrongpass');

    await expect(signIn({}, formData)).resolves.toEqual({
      error: 'Invalid email or password',
      email: 'wrong@example.com',
    });
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('signIn maps email_not_verified to a verification error', async () => {
    mockAuthenticateWithPassword.mockRejectedValueOnce({ code: 'email_not_verified' });

    const { signIn } = await import('@/app/actions/auth');
    const formData = new FormData();
    formData.set('email', 'pending@example.com');
    formData.set('password', 'password123');

    await expect(signIn({}, formData)).resolves.toEqual({
      error: 'Please verify your email before signing in',
      email: 'pending@example.com',
    });
  });

  it('signUp creates a user, sends verification email, and redirects', async () => {
    mockCreateUser.mockResolvedValueOnce({
      id: 'user_02',
      email: 'new@example.com',
    });
    mockSendVerificationEmail.mockResolvedValueOnce({
      user: { id: 'user_02', email: 'new@example.com' },
    });

    const { signUp } = await import('@/app/actions/auth');
    const formData = new FormData();
    formData.set('email', 'new@example.com');
    formData.set('password', 'password123');

    await expect(signUp({}, formData)).rejects.toThrow('REDIRECT:/auth/verify-email?pending=true');

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith({ userId: 'user_02' });
  });

  it('signUp validates minimum password length before calling WorkOS', async () => {
    const { signUp } = await import('@/app/actions/auth');
    const formData = new FormData();
    formData.set('email', 'new@example.com');
    formData.set('password', 'short');

    await expect(signUp({}, formData)).resolves.toEqual({
      error: 'Password must be at least 8 characters',
      email: 'new@example.com',
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('signUp maps user_already_exists to a form error', async () => {
    mockCreateUser.mockRejectedValueOnce({ code: 'user_already_exists' });

    const { signUp } = await import('@/app/actions/auth');
    const formData = new FormData();
    formData.set('email', 'new@example.com');
    formData.set('password', 'password123');

    await expect(signUp({}, formData)).resolves.toEqual({
      error: 'An account with this email already exists',
      email: 'new@example.com',
    });
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it('signUp returns a retryable error when verification email sending fails', async () => {
    mockCreateUser.mockResolvedValueOnce({
      id: 'user_03',
      email: 'new@example.com',
    });
    mockSendVerificationEmail.mockRejectedValueOnce(new Error('email service failed'));

    const { signUp } = await import('@/app/actions/auth');
    const formData = new FormData();
    formData.set('email', 'new@example.com');
    formData.set('password', 'password123');

    await expect(signUp({}, formData)).resolves.toEqual({
      error: 'We created your account but could not send the verification email. Please try again.',
      email: 'new@example.com',
    });
  });
});
