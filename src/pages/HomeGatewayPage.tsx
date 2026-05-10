import { TournamentPublicLayout } from '../components/TournamentPublicLayout'
import { useTournamentByCustomDomain } from '../hooks/useTournamentByCustomDomain'
import { isPrimarySiteHostname } from '../lib/siteHost'
import { HomePage } from './HomePage'

/**
 * Root `/`: sulla URL “di vetrina” (lista host in env) sempre la home marketing; negli altri casi si
 * cerca `tournaments.custom_domain === hostname`. Stesso progetto React + Supabase per tutti.
 */
export function HomeGatewayPage() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const treatAsMarketing = !hostname || isPrimarySiteHostname(hostname)

  const { tournament, loading, error } = useTournamentByCustomDomain(
    treatAsMarketing ? null : hostname,
  )

  if (treatAsMarketing) {
    return <HomePage />
  }

  if (loading) {
    return (
      <main className="page center">
        <p>Caricamento torneo…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page center">
        <h1>Errore</h1>
        <p>{error}</p>
        <p className="meta">
          In Supabase verifica che il torneo abbia{' '}
          <code>custom_domain = {hostname.toLowerCase()}</code>.
        </p>
      </main>
    )
  }

  /* Dominio senza torneo configurato → stessa hub marketing (senza bloccare *.vercel.app, ecc.). */
  if (!tournament) {
    return <HomePage />
  }

  return <TournamentPublicLayout tournament={tournament} />
}
