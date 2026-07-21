'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('unhandled render error', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Something went wrong</h1>
        <p className="text-sm text-neutral-500 mb-6">
          An unexpected error occurred. You can try again or head back to the dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <a href="/dashboard" className="btn-secondary">
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
