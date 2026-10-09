import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/lib/auth/password';

describe('validateNewPassword', () => {
  it('accepts a long enough matching password', () => {
    expect(validateNewPassword('s3cret-pw', 's3cret-pw')).toBeNull();
  });

  it('rejects a password shorter than the signup minimum', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6); // signup page enforces minLength 6
    expect(validateNewPassword('12345', '12345')).toMatch(/at least 6/);
  });

  it('rejects mismatched confirmation', () => {
    expect(validateNewPassword('s3cret-pw', 's3cret-px')).toMatch(/do not match/);
  });

  it('rejects empty input', () => {
    expect(validateNewPassword('', '')).not.toBeNull();
  });
});
