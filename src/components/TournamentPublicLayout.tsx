import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TournamentRow } from '../hooks/useTournamentBySlug'
import { TournamentTheme } from './TournamentTheme'

type Props = {
  tournament: TournamentRow
  children: ReactNode
}

export function TournamentPublicLayout({ tournament, children }: Props) {
  return (
    <TournamentTheme tournament={tournament}>
      <header className="site-header">
        <div>
          <p className="eyebrow">{tournament.location ?? 'Torneo'}</p>
          <h1>{tournament.name}</h1>
          <p className="meta">
            Calcio a {tournament.format} · Slug interno <code>{tournament.slug}</code>
            {tournament.custom_domain ? (
              <>
                {' '}
                · Dominio pubblico{' '}
                <code>{tournament.custom_domain}</code>
              </>
            ) : null}
          </p>
        </div>
        <Link className="btn btn-ghost" to={`/t/${tournament.slug}/admin`}>
          Area staff
        </Link>
      </header>

      <main className="page tournament-public-main">{children}</main>
    </TournamentTheme>
  )
}
