'use server';

import { saveSession } from '@workos-inc/authkit-nextjs';
import { WorkOS } from '@workos-inc/node';
import { redirect } from 'next/navigation';

export type AuthFormState = {
  error?: string;
  email?: string;
};

const INITIAL_STATE: AuthFormState = {};

function getWorkOSClient() {
  const apiKey = process.env.WORKOS_API_KEY;
  const clientId = process.env.WORKOS_CLIENT_ID;

  if (!apiKey) {
    throw new Error('WORKOS_API_KEY is required for email/password auth');
  }

  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID is required for email/password auth');
  }

  return new WorkOS({ apiKey, clientId });
}

function getSessionUrl() {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.WORKOS_REDIRECT_URI ??
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
}

function isWorkOSError(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code === code
  );
}

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  return { email, password };
}

export async function signIn(previousState: AuthFormState = INITIAL_STATE, formData: FormData): Promise<AuthFormState> {
  void previousState;
  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return {
      error: 'Enter your email and password',
      email,
    };
  }

  const sessionUrl = getSessionUrl();
  if (!sessionUrl) {
    throw new Error('APP_URL or WORKOS_REDIRECT_URI is required to save the WorkOS session');
  }

  let authResponse;

  try {
    authResponse = await getWorkOSClient().userManagement.authenticateWithPassword({
      email,
      password,
      clientId: process.env.WORKOS_CLIENT_ID!,
    });
  } catch (error) {
    if (isWorkOSError(error, 'email_not_verified')) {
      return {
        error: 'Please verify your email before signing in',
        email,
      };
    }

    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code: unknown }).code
        : undefined;

    if (code === 'invalid_credentials' || code === 'email_not_found' || typeof code === 'string') {
      return {
        error: 'Invalid email or password',
        email,
      };
    }

    console.error('[signIn] unexpected error:', error);
    return {
      error: 'Something went wrong, please try again',
      email,
    };
  }

  await saveSession(authResponse, sessionUrl);
  redirect('/dashboard');
}

export async function signUp(previousState: AuthFormState = INITIAL_STATE, formData: FormData): Promise<AuthFormState> {
  void previousState;
  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return {
      error: 'Enter your email and password',
      email,
    };
  }

  if (password.length < 8) {
    return {
      error: 'Password must be at least 8 characters',
      email,
    };
  }

  let user;

  try {
    user = await getWorkOSClient().userManagement.createUser({
      email,
      password,
    });
  } catch (error) {
    if (isWorkOSError(error, 'user_already_exists')) {
      return {
        error: 'An account with this email already exists',
        email,
      };
    }

    if (isWorkOSError(error, 'password_too_weak')) {
      return {
        error: 'Password must be at least 8 characters',
        email,
      };
    }

    return {
      error: 'Something went wrong, please try again',
      email,
    };
  }

  try {
    await getWorkOSClient().userManagement.sendVerificationEmail({ userId: user.id });
  } catch {
    return {
      error: 'We created your account but could not send the verification email. Please try again.',
      email,
    };
  }

  redirect('/auth/verify-email?pending=true');
}
