import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { StaffTournamentPanel } from '../components/staff/StaffTournamentPanel'
import { useAuth } from '../auth/useAuth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useTournamentBySlug } from '../hooks/useTournamentBySlug'

export function StaffPage() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const { session, loading: authLoading } = useAuth()
  const { tournament, loading: tLoading, error } = useTournamentBySlug(slug)

  const [staffState, setStaffState] = useState<'checking' | 'denied' | { role: 'owner' | 'admin' | 'scorer' }>('checking')

  useEffect(() => {
    if (!supabase || !session?.user || !tournament) {
      setStaffState('checking')
      return
    }
    let cancelled = false
    void supabase
      .from('tournament_staff')
      .select('role')
      .eq('tournament_id', tournament.id)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (!data?.role || !['owner', 'admin', 'scorer'].includes(data.role)) setStaffState('denied')
        else setStaffState({ role: data.role as 'owner' | 'admin' | 'scorer' })
      })
    return () => {
      cancelled = true
    }
  }, [session?.user, tournament])

  if (!isSupabaseConfigured) {
    return (
      <main className="page center">
        <p>Supabase non configurato.</p>
        <Link to="/">Home</Link>
      </main>
    )
  }

  if (authLoading || tLoading) {
    return (
      <main className="page center">
        <p>Caricamento…</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (!tournament || error) {
    return (
      <main className="page center">
        <h1>Torneo non trovato</h1>
        <p>{error ?? 'Slug non valido.'}</p>
        <Link to="/admin">Dashboard</Link>
      </main>
    )
  }

  if (staffState === 'denied') {
    return (
      <main className="page narrow">
        <h1>Accesso negato</h1>
        <p className="lede">
          Il tuo account non è staff di questo torneo. Se l’hai appena creato dalla dashboard, esci e
          rientra; altrimenti chiedi a un amministratore di aggiungerti in{' '}
          <code>tournament_staff</code>.
        </p>
        <Link to="/admin">← Dashboard</Link>
      </main>
    )
  }

  if (staffState === 'checking') {
    return (
      <main className="page center">
        <p>Verifica permessi…</p>
      </main>
    )
  }

  const canManageStructure = staffState.role === 'owner' || staffState.role === 'admin'

  return (
    <main className="page tournament-staff-main">
      <StaffTournamentPanel
        tournamentId={tournament.id}
        tournamentSlug={tournament.slug}
        tournamentName={tournament.name}
        canManageStructure={canManageStructure}
      />
    </main>
  )
}
