import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { roundRobinPairs } from '../../lib/roundRobin'
import { useTournamentContent, type ContentMatch } from '../../hooks/useTournamentContent'

type MatchSavePayload = Pick<ContentMatch, 'id' | 'home_score' | 'away_score' | 'status' | 'current_minute'>

type Props = {
  tournamentId: string
  tournamentSlug: string
  tournamentName: string
  canManageStructure: boolean
}

export function StaffTournamentPanel({
  tournamentId,
  tournamentSlug,
  tournamentName,
  canManageStructure,
}: Props) {
  const { teams, groups, memberships, matches, loading, error, refresh } = useTournamentContent(tournamentId)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [teamDraft, setTeamDraft] = useState('')
  const [groupDraft, setGroupDraft] = useState('')

  const teamNames = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of teams) m.set(t.id, t.name)
    return m
  }, [teams])

  useEffect(() => {
    const client = supabase
    if (!client || !tournamentId) return
    const ch = client
      .channel(`staff-matches-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(ch)
    }
  }, [tournamentId, refresh])

  async function notifyErr(e: unknown) {
    const s = typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : 'Errore'
    setMsg(s)
  }

  async function addTeam(ev: FormEvent) {
    ev.preventDefault()
    if (!supabase || !teamDraft.trim() || busy) return
    setBusy(true)
    setMsg(null)
    const nextOrder = teams.reduce((m, t) => Math.max(m, t.sort_order), -1) + 1
    const { error: err } = await supabase.from('teams').insert({
      tournament_id: tournamentId,
      name: teamDraft.trim(),
      sort_order: nextOrder,
    })
    setBusy(false)
    if (err) {
      notifyErr(err.message)
      return
    }
    setTeamDraft('')
    await refresh()
  }

  async function removeTeam(id: string, name: string) {
    if (!supabase || busy) return
    if (!window.confirm(`Eliminare la squadra «${name}»? Solo se non ha partite collegate.`)) return
    setBusy(true)
    setMsg(null)
    const { error: err } = await supabase.from('teams').delete().eq('id', id)
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    await refresh()
  }

  async function addGroup(ev: FormEvent) {
    ev.preventDefault()
    if (!supabase || !groupDraft.trim() || busy) return
    setBusy(true)
    setMsg(null)
    const nextOrder = groups.reduce((m, g) => Math.max(m, g.sort_order), -1) + 1
    const { error: err } = await supabase.from('groups').insert({
      tournament_id: tournamentId,
      label: groupDraft.trim(),
      sort_order: nextOrder,
    })
    setBusy(false)
    if (err) {
      notifyErr(err.message)
      return
    }
    setGroupDraft('')
    await refresh()
  }

  async function removeGroup(id: string, label: string) {
    if (!supabase || busy) return
    if (
      !window.confirm(
        `Eliminare il girone «${label}»? Le iscrizioni squadre saranno tolte e le partite di girone saranno sganciate.`,
      )
    )
      return
    setBusy(true)
    setMsg(null)
    const { error: err } = await supabase.from('groups').delete().eq('id', id)
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    await refresh()
  }

  async function assignTeamToGroup(teamId: string, groupId: string) {
    if (!supabase || busy || !teamId || !groupId) return
    setBusy(true)
    setMsg(null)
    await supabase.from('group_memberships').delete().eq('team_id', teamId)
    const { error: err } = await supabase.from('group_memberships').insert({ group_id: groupId, team_id: teamId })
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    await refresh()
  }

  async function removeTeamFromGroup(teamId: string, groupId: string) {
    if (!supabase || busy) return
    setBusy(true)
    setMsg(null)
    const { error: err } = await supabase.from('group_memberships').delete().match({ group_id: groupId, team_id: teamId })
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    await refresh()
  }

  async function generateRoundRobin(groupId: string) {
    const teamIds = memberships.filter((m) => m.group_id === groupId).map((m) => m.team_id)
    if (teamIds.length < 2) {
      setMsg('Serve almeno due squadre nel girone per generare il calendario.')
      return
    }
    if (
      matches.some((m) => m.group_id === groupId && m.phase === 'group') &&
      !window.confirm('Esistono già partite per questo girone. Eliminarle e rigenerare?')
    )
      return
    if (!supabase || busy) return
    setBusy(true)
    setMsg(null)
    await supabase.from('matches').delete().eq('tournament_id', tournamentId).eq('group_id', groupId).eq('phase', 'group')
    const sortBase = matches.reduce((m, x) => Math.max(m, x.sort_order), 0)
    const pairs = roundRobinPairs(teamIds)
    const rows = pairs.map(({ home, away }, i) => ({
      tournament_id: tournamentId,
      group_id: groupId,
      phase: 'group' as const,
      home_team_id: home,
      away_team_id: away,
      status: 'scheduled' as const,
      home_score: 0,
      away_score: 0,
      sort_order: sortBase + i + 1,
    }))
    const { error: err } = await supabase.from('matches').insert(rows)
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    await refresh()
  }

  async function saveMatch(patch: MatchSavePayload) {
    if (!supabase || busy) return
    setBusy(true)
    setMsg(null)
    const { error: err } = await supabase
      .from('matches')
      .update({
        home_score: patch.home_score,
        away_score: patch.away_score,
        status: patch.status,
        current_minute: patch.current_minute ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patch.id)
    setBusy(false)
    if (err) {
      setMsg(err.message)
      return
    }
    await refresh()
  }

  if (loading) {
    return <p className="muted">Caricamento dati torneo…</p>
  }
  if (error) {
    return <p className="form-error">{error}</p>
  }

  return (
    <>
      <p className="eyebrow">Staff · {tournamentName}</p>
      <h1>Gestione torneo</h1>
      <p className="lede small">
        {canManageStructure
          ? 'Squadre, gironi e generazione dell’andata. I risultativi vedono sempre le partite sotto.'
          : 'Inserimento risultati: solo partite qui sotto.'}
      </p>
      <div className="actions" style={{ marginBottom: '1.25rem' }}>
        <Link className="btn btn-ghost" to={`/t/${tournamentSlug}`}>
          Sito pubblico
        </Link>
        <Link className="btn btn-ghost" to="/admin">
          Dashboard
        </Link>
      </div>

      {msg ? <p className="form-error">{msg}</p> : null}

      {canManageStructure ? (
        <>
          <section className="card form-card staff-section">
            <h2>Squadre</h2>
            <form className="form field-row grid-form" onSubmit={addTeam}>
              <div className="field" style={{ flex: '2 1 200px' }}>
                <label>
                  <span>Nome squadra</span>
                  <input value={teamDraft} onChange={(e) => setTeamDraft(e.target.value)} required />
                </label>
              </div>
              <div className="field" style={{ alignSelf: 'end' }}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Aggiungi
                </button>
              </div>
            </form>
            {teams.length === 0 ? (
              <p className="muted">Nessuna squadra ancora.</p>
            ) : (
              <ul className="staff-plain-list">
                {teams.map((t) => (
                  <li key={t.id}>
                    <strong>{t.name}</strong>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void removeTeam(t.id, t.name)}>
                      Elimina
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card form-card staff-section">
            <h2>Gironi e iscrizione</h2>
            <form className="form field-row grid-form" onSubmit={addGroup}>
              <div className="field" style={{ flex: '2 1 200px' }}>
                <label>
                  <span>Nome girone</span>
                  <input value={groupDraft} onChange={(e) => setGroupDraft(e.target.value)} required placeholder="es. Girone A" />
                </label>
              </div>
              <div className="field" style={{ alignSelf: 'end' }}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Crea girone
                </button>
              </div>
            </form>
            {groups.length === 0 ? (
              <p className="muted">Crea un girone, poi iscrivici le squadre.</p>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="staff-group-block">
                  <div className="staff-group-head">
                    <h3>{g.label}</h3>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void removeGroup(g.id, g.label)}>
                      Elimina girone
                    </button>
                  </div>
                  <p className="muted small">Squadre nel girone</p>
                  <ul className="staff-plain-list compact">
                    {memberships
                      .filter((m) => m.group_id === g.id)
                      .map((m) => (
                        <li key={m.team_id}>
                          {teamNames.get(m.team_id) ?? m.team_id}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => void removeTeamFromGroup(m.team_id, g.id)}
                          >
                            Togli dal girone
                          </button>
                        </li>
                      ))}
                  </ul>
                  <div className="field-row" style={{ marginTop: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <AssignTeamSelect
                      teams={teams}
                      memberships={memberships}
                      groupId={g.id}
                      disabled={busy}
                      onAssign={(tid) => void assignTeamToGroup(tid, g.id)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy}
                      onClick={() => void generateRoundRobin(g.id)}
                    >
                      Genera calendario (andata)
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      ) : null}

      <section className="card form-card staff-section">
        <h2>Partite e risultati</h2>
        {matches.length === 0 ? (
          <p className="muted">Nessuna partita pianificata.</p>
        ) : (
          <div className="staff-matches-stack">
            {matches.map((m) => (
              <MatchStaffRow
                key={`${m.id}-${m.home_score}-${m.away_score}-${m.status}-${m.current_minute ?? ''}`}
                m={m}
                names={teamNames}
                busy={busy}
                onSave={(p) => void saveMatch(p)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function MatchStaffRow({
  m,
  names,
  busy,
  onSave,
}: {
  m: ContentMatch
  names: Map<string, string>
  busy: boolean
  onSave: (p: MatchSavePayload) => void
}) {
  const [hs, setHs] = useState(m.home_score)
  const [as, setAs] = useState(m.away_score)
  const [st, setSt] = useState(m.status)
  const [min, setMin] = useState<number | ''>(() => (m.current_minute == null ? '' : Number(m.current_minute)))

  return (
    <div className="staff-match-card">
      <div className="staff-match-names">
        <strong>{names.get(m.home_team_id) ?? 'Casa'}</strong>
        <span className="staff-vs">—</span>
        <strong>{names.get(m.away_team_id) ?? 'Trasferta'}</strong>
      </div>
      <div className="staff-match-fields">
        <label className="field inline">
          <span>Casa</span>
          <input
            type="number"
            min={0}
            value={hs}
            onChange={(e) => setHs(Number(e.target.value) || 0)}
            aria-label="Gol casa"
          />
        </label>
        <label className="field inline">
          <span>Trasferta</span>
          <input
            type="number"
            min={0}
            value={as}
            onChange={(e) => setAs(Number(e.target.value) || 0)}
            aria-label="Gol trasferta"
          />
        </label>
        <label className="field inline wide">
          <span>Stato</span>
          <select value={st} onChange={(e) => setSt(e.target.value as typeof st)}>
            <option value="scheduled">Programmata</option>
            <option value="live">Live</option>
            <option value="finished">Conclusa</option>
            <option value="cancelled">Annullata</option>
          </select>
        </label>
        <label className="field inline narrow">
          <span>Min</span>
          <input
            type="number"
            min={0}
            max={150}
            value={min === '' ? '' : min}
            onChange={(e) => setMin(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="-"
          />
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() =>
            onSave({
              id: m.id,
              home_score: hs,
              away_score: as,
              status: st,
              current_minute: min === '' ? null : Number(min),
            })
          }
        >
          Salva
        </button>
      </div>
    </div>
  )
}

function AssignTeamSelect({
  teams,
  memberships,
  groupId,
  disabled,
  onAssign,
}: {
  teams: { id: string; name: string }[]
  memberships: { group_id: string; team_id: string }[]
  groupId: string
  disabled: boolean
  onAssign: (teamId: string) => void
}) {
  const inGroup = useMemo(() => new Set(memberships.filter((m) => m.group_id === groupId).map((m) => m.team_id)), [memberships, groupId])

  /** Squadre disponibili: non sono già nel girone (possono stare in altro girone; le spostiamo assegnando). */
  const options = teams.filter((t) => !inGroup.has(t.id))
  const [sel, setSel] = useState('')

  return (
    <div className="field" style={{ minWidth: '200px' }}>
      <span>Aggiungi squadra</span>
      <div className="field-row">
        <select value={sel} onChange={(e) => setSel(e.target.value)} disabled={disabled || options.length === 0}>
          <option value="">{options.length === 0 ? '(tutte iscritte)' : '— Scegli —'}</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost btn-sm" disabled={disabled || !sel} onClick={() => { onAssign(sel); setSel('') }}>
          Aggiungi
        </button>
      </div>
    </div>
  )
}
