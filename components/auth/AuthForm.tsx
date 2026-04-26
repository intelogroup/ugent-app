'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { AuthFormState } from '@/app/actions/auth';

const initialState: AuthFormState = {};

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  title: string;
  subtitle: string;
  submitLabel: string;
  pendingLabel: string;
  alternateHref: string;
  alternateLabel: string;
  alternateCta: string;
  fallbackHref?: string;
  fallbackLabel?: string;
};

export function AuthForm({
  mode,
  action,
  title,
  subtitle,
  submitLabel,
  pendingLabel,
  alternateHref,
  alternateLabel,
  alternateCta,
  fallbackHref,
  fallbackLabel,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-neutral-800">{title}</h2>
        <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
      </div>

      <form action={formAction} className="group space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.email ?? ''}
            required
            className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-neutral-900 outline-none transition focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'sign-up' ? 8 : undefined}
            className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-neutral-900 outline-none transition focus:border-primary-500"
          />
        </div>

        {state.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-neutral-600">
        {alternateLabel}{' '}
        <Link href={alternateHref} className="font-semibold text-primary-600 hover:text-primary-700">
          {alternateCta}
        </Link>
      </div>

      {fallbackHref && fallbackLabel ? (
        <div className="mt-4 text-center text-sm">
          <a href={fallbackHref} className="text-neutral-500 underline-offset-4 hover:text-neutral-700 hover:underline">
            {fallbackLabel}
          </a>
        </div>
      ) : null}
    </div>
  );
}
