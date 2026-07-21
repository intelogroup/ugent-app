'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export function ConditionalProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.refresh()
    })
    setReady(true)
    return () => subscription.unsubscribe()
  }, [router])

  if (!ready) return null
  return <>{children}</>
}
