'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

const CONSENT_KEY = 'ugent-consent';

function subscribe(callback: () => void) {
  window.addEventListener('ugent-consent', callback);
  return () => window.removeEventListener('ugent-consent', callback);
}

function getSnapshot() {
  return window.localStorage.getItem(CONSENT_KEY);
}

function getServerSnapshot() {
  return null;
}

export default function ConsentBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = consent === null;

  function accept() {
    window.localStorage.setItem(CONSENT_KEY, 'accepted');
    window.dispatchEvent(new Event('ugent-consent'));
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Privacy consent"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 card p-4 shadow-lg"
    >
      <p className="text-sm text-neutral-600">
        Ugent uses authentication cookies and stores your study data to run the
        service. Voice input you send is transcribed by a third-party provider. See our{' '}
        <Link href="/privacy" className="text-primary-600 font-medium hover:underline">
          Privacy Policy
        </Link>{' '}
        and{' '}
        <Link href="/terms" className="text-primary-600 font-medium hover:underline">
          Terms of Service
        </Link>
        .
      </p>
      <div className="flex justify-end mt-3">
        <button type="button" onClick={accept} className="btn-primary">
          Got it
        </button>
      </div>
    </div>
  );
}
