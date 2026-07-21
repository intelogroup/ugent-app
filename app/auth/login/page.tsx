'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ERROR_MESSAGES: Record<string, string> = {
  verification_failed: 'That verification link is invalid or expired.',
  auth_failed: 'Sign-in failed. Please try again.',
  email_unverified: 'Please confirm your email before signing in — check your inbox.',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const [error, setError] = useState<string | null>(
    urlError ? ERROR_MESSAGES[urlError] ?? 'Something went wrong. Please try again.' : null
  )
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Sign in</h1>
        <p className="text-sm text-neutral-500 mb-6">Continue your USMLE prep</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border-2 border-neutral-200 rounded-lg text-base focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border-2 border-neutral-200 rounded-lg text-base focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-neutral-500 text-center mt-6">
          No account?{' '}
          <Link href="/auth/signup" className="text-primary-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
