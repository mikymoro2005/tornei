import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

export type TournamentRow = Database['public']['Tables']['tournaments']['Row']

const demoTournament: TournamentRow = {
  id: '00000000-0000-0000-0000-000000000001',
  organizer_id: null,
  slug: 'demo-estate-2026',
  name: 'Torneo demo estate 2026',
  location: 'Campo comunale',
  format: 7,
  starts_on: '2026-07-01',
  ends_on: '2026-08-31',
  is_public: true,
  theme_primary: '#15803d',
  theme_secondary: '#eab308',
  logo_url: null,
  custom_domain: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function useTournamentBySlug(slug: string | undefined) {
  const [tournament, setTournament] = useState<TournamentRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setTournament(null)
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setTournament(slug === demoTournament.slug ? demoTournament : null)
      setLoading(false)
      setError(
        slug === demoTournament.slug
          ? null
          : 'Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY oppure usa lo slug demo-estate-2026',
      )
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void supabase
      .from('tournaments')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error: qErr }) => {
        if (cancelled) return
        if (qErr) {
          setError(qErr.message)
          setTournament(null)
        } else {
          setTournament(data)
          if (!data) setError('Torneo non trovato')
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return { tournament, loading, error }
}
