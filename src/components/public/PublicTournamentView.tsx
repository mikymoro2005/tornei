import { useEffect, useMemo, useState } from 'react'
import type { TournamentRow } from '../../hooks/useTournamentBySlug'
import { useTournamentContent } from '../../hooks/useTournamentContent'
import { supabase } from '../../lib/supabase'
import { computeGroupStandings } from '../../lib/standings'

type Tab = 'home' | 'groups' | 'matches'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programmata',
  live: 'Live',
  finished: 'Conclusa',
  cancelled: 'Annullata',
}

export function PublicTournamentView({ tournament }: { tournament: TournamentRow }) {
  const { teams, groups, memberships, matches, loading, error, refresh } = useTournamentContent(tournament.id)
  const [tab, setTab] = useState<Tab>('home')

  const teamNames = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of teams) m.set(t.id, t.name)
    return m
  }, [teams])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const ch = client
      .channel(`public-matches-${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(ch)
    }
  }, [tournament.id, refresh])

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.sort_order - b.sort_order), [groups])

  const upcoming = useMemo(() => {
    return matches
      .filter((m) => m.status === 'scheduled')
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .slice(0, 6)
  }, [matches])

  const liveMatches = useMemo(() => matches.filter((m) => m.status === 'live'), [matches])

  if (loading) {
    return <p className="muted">Caricamento…</p>
  }
  if (error) {
    return <p className="form-error">{error}</p>
  }

  return (
    <div className="public-tournament">
      <nav className="tab-nav" aria-label="Sezioni torneo">
        <button type="button" className={`tab-btn${tab === 'home' ? ' active' : ''}`} onClick={() => setTab('home')}>
          Panoramica
        </button>
        <button type="button" className={`tab-btn${tab === 'groups' ? ' active' : ''}`} onClick={() => setTab('groups')}>
          Gironi
        </button>
        <button type="button" className={`tab-btn${tab === 'matches' ? ' active' : ''}`} onClick={() => setTab('matches')}>
          Calendario
        </button>
      </nav>

      {tab === 'home' ? (
        <section className="card public-section">
          <h2>In sintesi</h2>
          {liveMatches.length > 0 ? (
            <>
              <p className="eyebrow live-pill-wrap">Live</p>
              <ul className="public-match-mini-list">
                {liveMatches.map((m) => (
                  <li key={m.id}>
                    <LiveLine m={m} names={teamNames} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Nessuna partita live al momento.</p>
          )}
          <h3 className="subsection-title">Prossime programmate</h3>
          {upcoming.length === 0 ? (
            <p className="muted">Nessuna partita in calendario.</p>
          ) : (
            <ul className="public-match-mini-list">
              {upcoming.map((m) => (
                <li key={m.id}>
                  <MatchLineShort m={m} names={teamNames} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'groups' ? (
        <div className="public-groups-stack">
          {sortedGroups.length === 0 ? (
            <p className="muted">I gironi non sono ancora stati pubblicati.</p>
          ) : (
            sortedGroups.map((g) => {
              const ids = memberships.filter((mm) => mm.group_id === g.id).map((mm) => mm.team_id)
              const standings = computeGroupStandings(ids, teamNames, matches, g.id)
              return (
                <section key={g.id} className="card public-section">
                  <h2>{g.label}</h2>
                  <div className="table-wrap">
                    <table className="standings-table">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Squadra</th>
                          <th scope="col">Pt</th>
                          <th scope="col">PJ</th>
                          <th scope="col">GF</th>
                          <th scope="col">GS</th>
                          <th scope="col">DR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((row, idx) => (
                          <tr key={row.teamId}>
                            <td>{idx + 1}</td>
                            <td>{row.teamName}</td>
                            <td>{row.points}</td>
                            <td>{row.played}</td>
                            <td>{row.gf}</td>
                            <td>{row.ga}</td>
                            <td>{row.gf - row.ga}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })
          )}
        </div>
      ) : null}

      {tab === 'matches' ? (
        <section className="card public-section">
          <h2>Tutte le partite</h2>
          {matches.length === 0 ? (
            <p className="muted">Ancora nessuna partita.</p>
          ) : (
            <div className="table-wrap">
              <table className="matches-wide-table">
                <thead>
                  <tr>
                    <th>Casa</th>
                    <th>Risultato</th>
                    <th>Ospiti</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {[...matches]
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((m) => (
                      <tr key={m.id}>
                        <td>{teamNames.get(m.home_team_id) ?? '—'}</td>
                        <td className="score-cell">
                          {m.home_score} — {m.away_score}
                        </td>
                        <td>{teamNames.get(m.away_team_id) ?? '—'}</td>
                        <td>{STATUS_LABEL[m.status] ?? m.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}

function MatchLineShort({
  m,
  names,
}: {
  m: {
    home_team_id: string
    away_team_id: string
    home_score: number
    away_score: number
  }
  names: Map<string, string>
}) {
  return (
    <span>
      <strong>{names.get(m.home_team_id) ?? 'Casa'}</strong> contro <strong>{names.get(m.away_team_id) ?? 'Ospiti'}</strong>
    </span>
  )
}

function LiveLine({
  m,
  names,
}: {
  m: { home_team_id: string; away_team_id: string; home_score: number; away_score: number; current_minute: number | null }
  names: Map<string, string>
}) {
  const min = m.current_minute != null ? `${m.current_minute}'` : ''
  return (
    <span className="live-line">
      <strong>{names.get(m.home_team_id) ?? 'Casa'}</strong>
      {' '}
      <span className="score-pill">{m.home_score}</span>
      —
      <span className="score-pill">{m.away_score}</span>
      {' '}
      <strong>{names.get(m.away_team_id) ?? 'Ospiti'}</strong>
      {min ? <span className="muted"> · {min}</span> : null}
    </span>
  )
}
