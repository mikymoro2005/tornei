import { Link, useParams } from 'react-router-dom'
import { PublicTournamentView } from '../components/public/PublicTournamentView'
import { TournamentPublicLayout } from '../components/TournamentPublicLayout'
import { useTournamentBySlug } from '../hooks/useTournamentBySlug'

export function TournamentPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const { tournament, loading, error } = useTournamentBySlug(slug)

  if (loading) {
    return (
      <main className="page center">
        <p>Caricamento torneo…</p>
      </main>
    )
  }

  if (!tournament || error) {
    return (
      <main className="page center">
        <h1>Torneo non trovato</h1>
        <p>{error ?? 'Slug non valido.'}</p>
        <Link to="/">Torna alla home</Link>
      </main>
    )
  }

  return (
    <TournamentPublicLayout tournament={tournament}>
      <PublicTournamentView tournament={tournament} />
    </TournamentPublicLayout>
  )
}
