'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, ArrowRight, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { validateNewPassword } from '@/lib/auth/password'

type Phase = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // The emailed link goes through /auth/callback, which trades the code for a session.
  // No session here means the link was opened twice, expired, or never used.
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setPhase(data.user ? 'ready' : 'invalid'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const problem = validateNewPassword(password, confirm)
    if (problem) { setError(problem); return }

    setLoading(true)
    setError(null)
    const { error } = await createClient().auth.updateUser({ password })
    setLoading(false)

    if (error) { setError(error.message); return }
    setPhase('done')
    setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1200)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-600/20 to-indigo-600/20 blur-[140px] rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Ugent</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Choose a new password</h1>
        </div>

        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {phase === 'checking' && <p role="status" className="text-sm text-slate-400">Checking your link...</p>}

          {phase === 'invalid' && (
            <div role="alert" className="text-sm text-slate-200 space-y-3">
              <p>This reset link is invalid or has expired.</p>
              <Link href="/auth/forgot-password" className="inline-block text-cyan-400 font-semibold hover:underline">Request a new link</Link>
            </div>
          )}

          {phase === 'done' && <p role="status" className="text-sm text-slate-200">Password updated. Taking you to your dashboard...</p>}

          {phase === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {(['password', 'confirm'] as const).map((field) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {field === 'password' ? 'New password' : 'Confirm new password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id={field}
                      type="password"
                      value={field === 'password' ? password : confirm}
                      onChange={(e) => (field === 'password' ? setPassword(e.target.value) : setConfirm(e.target.value))}
                      required
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                </div>
              ))}

              {error && (
                <div role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-300 hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? 'Saving...' : 'Update password'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
