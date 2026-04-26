import { getSignInUrl, withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { signIn } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth/AuthForm';

export default async function LoginPage() {
  const { user } = await withAuth();
  if (user) redirect('/dashboard');

  const signInUrl = await getSignInUrl();

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

        {/* Login Card */}
        <AuthForm
          mode="sign-in"
          action={signIn}
          title="Sign in to your account"
          subtitle="Use your email and password. The hosted WorkOS flow remains available as a fallback."
          submitLabel="Sign in"
          pendingLabel="Signing in..."
          alternateHref="/signup"
          alternateLabel="Don't have an account?"
          alternateCta="Sign up"
          fallbackHref={signInUrl}
          fallbackLabel="Sign in another way"
        />

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
