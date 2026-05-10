import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function usePlatformOperator(user: User | null) {
  const [isOperator, setIsOperator] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsOperator(false)
      setLoading(false)
      return
    }
    if (!user) {
      setIsOperator(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void supabase
      .from('platform_operators')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setIsOperator(false)
        } else {
          setIsOperator(!!data)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { isOperator, loading }
}
