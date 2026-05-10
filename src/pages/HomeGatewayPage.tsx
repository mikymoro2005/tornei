import { TournamentPublicLayout } from '../components/TournamentPublicLayout'
import { useTournamentByCustomDomain } from '../hooks/useTournamentByCustomDomain'
import { isPrimarySiteHostname, isVercelAppHostname } from '../lib/siteHost'
import { isSupabaseConfigured } from '../lib/supabase'
import { HomePage } from './HomePage'

/**
 * Root `/`: home marketing per host principali + qualunque `*.vercel.app`; `custom_domain` solo per
 * domini cliente (non sottodomini Vercel).
 */
export function HomeGatewayPage() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const treatAsMarketing =
    !hostname ||
    isPrimarySiteHostname(hostname) ||
    isVercelAppHostname(hostname)

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
    const needsVercelEnv =
      !isSupabaseConfigured ||
      /non configurato|invalid .*key|jwt|Unauthorized/i.test(error)
    return (
      <main className="page narrow">
        <h1>Errore</h1>
        <p className="lede">{error}</p>
        {needsVercelEnv ? (
          <section className="card">
            <h2>Manca Supabase sul deploy?</h2>
            <ul className="list">
              <li>
                Vercel → progetto → <strong>Settings → Environment Variables</strong>
              </li>
              <li>
                Aggiungi <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> del
                tuo progetto Supabase (stessi nomi sia in Production che Preview se usi anche i
                deploy di anteprima).
              </li>
              <li>
                Salva e rifai un <strong>Redeploy</strong> — le chiavi sono lette solo in build.
              </li>
            </ul>
          </section>
        ) : (
          <p className="meta">
            Per questo dominio controlla in Supabase{' '}
            <code>tournaments.custom_domain = {hostname.toLowerCase()}</code>.
          </p>
        )}
      </main>
    )
  }

  /* Dominio senza torneo configurato → stessa hub marketing (senza bloccare *.vercel.app, ecc.). */
  if (!tournament) {
    return <HomePage />
  }

  return <TournamentPublicLayout tournament={tournament} />
}
