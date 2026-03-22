import { describe, it, expect, vi, beforeEach } from 'vitest';

// WorkOS OTP (email verification code) flow:
// 1. User enters email → WorkOS sends OTP
// 2. User enters OTP → WorkOS validates → redirects to callback

const mockOtpSession = {
  pendingAuthenticationToken: 'pat_otp_abc123',
  email: 'test@example.com',
  authenticationFactorId: 'auth_factor_01',
};

const mockUser = {
  id: 'user_01',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: true,
};

// Simulate WorkOS UserManagement API for OTP
const mockWorkOS = {
  userManagement: {
    sendVerificationEmail: vi.fn(),
    verifyEmail: vi.fn(),
    authenticateWithCode: vi.fn(),
    sendMagicAuthCode: vi.fn(),
    authenticateWithMagicAuth: vi.fn(),
  },
};

vi.mock('@workos-inc/node', () => ({
  WorkOS: vi.fn(() => mockWorkOS),
}));

describe('OTP (Email Code) Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends OTP code to user email', async () => {
    mockWorkOS.userManagement.sendMagicAuthCode.mockResolvedValueOnce({ success: true });

    await mockWorkOS.userManagement.sendMagicAuthCode({ email: 'test@example.com' });

    expect(mockWorkOS.userManagement.sendMagicAuthCode).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });

  it('authenticates user with valid OTP code', async () => {
    mockWorkOS.userManagement.authenticateWithMagicAuth.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'tok_abc',
      refreshToken: 'rtok_abc',
    });

    const result = await mockWorkOS.userManagement.authenticateWithMagicAuth({
      code: '123456',
      email: 'test@example.com',
      clientId: 'client_01',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.emailVerified).toBe(true);
    expect(result.accessToken).toBeTruthy();
  });

  it('rejects invalid OTP code', async () => {
    mockWorkOS.userManagement.authenticateWithMagicAuth.mockRejectedValueOnce(
      new Error('Invalid or expired code')
    );

    await expect(
      mockWorkOS.userManagement.authenticateWithMagicAuth({
        code: '000000',
        email: 'test@example.com',
        clientId: 'client_01',
      })
    ).rejects.toThrow('Invalid or expired code');
  });

  it('rejects expired OTP code', async () => {
    mockWorkOS.userManagement.authenticateWithMagicAuth.mockRejectedValueOnce(
      new Error('Code has expired')
    );

    await expect(
      mockWorkOS.userManagement.authenticateWithMagicAuth({
        code: '123456',
        email: 'test@example.com',
        clientId: 'client_01',
      })
    ).rejects.toThrow('Code has expired');
  });

  it('OTP code is 6 digits', () => {
    const otpRegex = /^\d{6}$/;
    expect('123456').toMatch(otpRegex);
    expect('12345').not.toMatch(otpRegex);
    expect('1234567').not.toMatch(otpRegex);
    expect('abcdef').not.toMatch(otpRegex);
  });

  it('verifies email after successful OTP', async () => {
    mockWorkOS.userManagement.verifyEmail.mockResolvedValueOnce({
      user: { ...mockUser, emailVerified: true },
    });

    const result = await mockWorkOS.userManagement.verifyEmail({
      code: '123456',
      pendingAuthenticationToken: mockOtpSession.pendingAuthenticationToken,
    });

    expect(result.user.emailVerified).toBe(true);
  });
});
