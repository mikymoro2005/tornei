import type { ReactNode } from 'react'
import type { TournamentRow } from '../hooks/useTournamentBySlug'

type Props = {
  tournament: TournamentRow
  children: ReactNode
}

export function TournamentTheme({ tournament, children }: Props) {
  return (
    <div
      className="tournament-shell"
      style={
        {
          '--t-primary': tournament.theme_primary,
          '--t-secondary': tournament.theme_secondary,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
