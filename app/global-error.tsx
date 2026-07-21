'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('unhandled root error', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h1>
            <p style={{ fontSize: '0.875rem', color: '#737373', marginBottom: '1.5rem' }}>
              A critical error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', background: '#0284c7', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
