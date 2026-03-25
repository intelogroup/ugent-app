import { getSignUpUrl, withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default async function SignupPage() {
  const { user } = await withAuth();
  if (user) redirect('/dashboard');

  const signUpUrl = await getSignUpUrl();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900">Ugent</h1>
          </div>
          <p className="text-neutral-600 mt-2">Usmle Study Agent</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-neutral-800 mb-6 text-center">Create your account</h2>
          <a
            href={signUpUrl}
            className="block w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-center"
          >
            Create Account
          </a>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
