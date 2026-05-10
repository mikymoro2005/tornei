export type StandingRow = {
  teamId: string
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
}

type Acc = Pick<StandingRow, 'played' | 'won' | 'drawn' | 'lost' | 'gf' | 'ga' | 'points'>

function recordResult(s: Acc, gf: number, ga: number) {
  s.played += 1
  s.gf += gf
  s.ga += ga
  if (gf > ga) {
    s.won += 1
    s.points += 3
  } else if (gf === ga) {
    s.drawn += 1
    s.points += 1
  } else {
    s.lost += 1
  }
}

const emptyAcc = (): Acc => ({
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  gf: 0,
  ga: 0,
  points: 0,
})

/** Conta solo partite di girone con esito aggiornato (live o finite). */
export function computeGroupStandings(
  teamIds: string[],
  teamNames: Map<string, string>,
  matches: Array<{
    group_id: string | null
    home_team_id: string
    away_team_id: string
    home_score: number
    away_score: number
    status: string
  }>,
  groupId: string,
): StandingRow[] {
  const homeAcc = new Map<string, Acc>()
  for (const id of teamIds) homeAcc.set(id, emptyAcc())

  for (const m of matches) {
    if (m.group_id !== groupId) continue
    if (m.status !== 'live' && m.status !== 'finished') continue
    const h = homeAcc.get(m.home_team_id)
    const a = homeAcc.get(m.away_team_id)
    if (h && a) {
      recordResult(h, m.home_score, m.away_score)
      recordResult(a, m.away_score, m.home_score)
    }
  }

  const rows: StandingRow[] = teamIds.map((id) => {
    const row = homeAcc.get(id)!
    return {
      teamId: id,
      teamName: teamNames.get(id) ?? id,
      ...row,
    }
  })

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.gf - a.ga
    const gdB = b.gf - b.ga
    if (gdB !== gdA) return gdB - gdA
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.teamName.localeCompare(b.teamName, 'it')
  })
  return rows
}
