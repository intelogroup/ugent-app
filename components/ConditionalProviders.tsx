'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export function ConditionalProviders({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.refresh()
    })
    return () => subscription.unsubscribe()
  }, [router])

  return <>{children}</>
}
