import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { TournamentRow } from './useTournamentBySlug'

export function useTournamentByCustomDomain(hostname: string | null) {
  const [tournament, setTournament] = useState<TournamentRow | null>(null)
  const [loading, setLoading] = useState(Boolean(hostname))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hostname) {
      setTournament(null)
      setLoading(false)
      setError(null)
      return
    }

    const h = hostname.trim().toLowerCase()
    if (!h || !isSupabaseConfigured || !supabase) {
      setTournament(null)
      setLoading(false)
      setError(isSupabaseConfigured ? null : 'Supabase non configurato')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void supabase
      .from('tournaments')
      .select('*')
      .eq('custom_domain', h)
      .maybeSingle()
      .then(({ data, error: qErr }) => {
        if (cancelled) return
        if (qErr) {
          setError(qErr.message)
          setTournament(null)
        } else {
          setTournament(data as TournamentRow | null)
          if (!data) setError(null)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [hostname])

  return { tournament, loading, error }
}
