import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-neutral-900">Check your inbox</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          We sent a verification email to finish creating your account. Open that link, then come back and sign in.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
