import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useTournamentBySlug } from '../hooks/useTournamentBySlug'

export function StaffPage() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const { session, loading: authLoading } = useAuth()
  const { tournament, loading: tLoading, error } = useTournamentBySlug(slug)

  const [staffOk, setStaffOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase || !session?.user || !tournament) {
      setStaffOk(null)
      return
    }
    let cancelled = false
    void supabase
      .from('tournament_staff')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setStaffOk(!!data)
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

  if (staffOk === false) {
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

  if (staffOk === null) {
    return (
      <main className="page center">
        <p>Verifica permessi…</p>
      </main>
    )
  }

  return (
    <main className="page narrow">
      <p className="eyebrow">Staff · {tournament.name}</p>
      <h1>Pannello risultati</h1>
      <p className="lede">
        Da qui (con sessione attiva) potrai aggiornare <code>matches</code> e inserire{' '}
        <code>goals</code>; la pagina pubblica si aggiorna con Realtime.
      </p>
      <div className="actions">
        <Link className="btn btn-ghost" to={`/t/${tournament.slug}`}>
          Sito pubblico
        </Link>
        <Link className="btn btn-ghost" to="/admin">
          Dashboard
        </Link>
      </div>
    </main>
  )
}
