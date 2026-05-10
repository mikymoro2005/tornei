import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type ContentTeam = {
  id: string
  tournament_id: string
  name: string
  short_name: string | null
  sort_order: number
}

export type ContentGroup = {
  id: string
  tournament_id: string
  label: string
  sort_order: number
}

export type ContentMembership = {
  group_id: string
  team_id: string
}

export type ContentMatch = {
  id: string
  tournament_id: string
  group_id: string | null
  phase: 'group' | 'knockout' | 'placement'
  home_team_id: string
  away_team_id: string
  status: 'scheduled' | 'live' | 'finished' | 'cancelled'
  home_score: number
  away_score: number
  current_minute: number | null
  scheduled_at: string | null
  sort_order: number
}

export function useTournamentContent(tournamentId: string | undefined) {
  const [teams, setTeams] = useState<ContentTeam[]>([])
  const [groups, setGroups] = useState<ContentGroup[]>([])
  const [memberships, setMemberships] = useState<ContentMembership[]>([])
  const [matches, setMatches] = useState<ContentMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !tournamentId) {
      setTeams([])
      setGroups([])
      setMemberships([])
      setMatches([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [tr, tg, tm] = await Promise.all([
      supabase.from('teams').select('id,tournament_id,name,short_name,sort_order').eq('tournament_id', tournamentId).order('sort_order'),
      supabase.from('groups').select('id,tournament_id,label,sort_order').eq('tournament_id', tournamentId).order('sort_order'),
      supabase
        .from('matches')
        .select(
          'id,tournament_id,group_id,phase,home_team_id,away_team_id,status,home_score,away_score,current_minute,scheduled_at,sort_order',
        )
        .eq('tournament_id', tournamentId)
        .order('sort_order', { ascending: true }),
    ])

    if (tr.error) {
      setError(tr.error.message)
      setLoading(false)
      return
    }
    const teamIds = new Set((tr.data ?? []).map((t: { id: string }) => t.id))
    if (tg.error) {
      setError(tg.error.message)
      setLoading(false)
      return
    }
    if (tm.error) {
      setError(tm.error.message)
      setLoading(false)
      return
    }

    const groupIds = (tg.data ?? []).map((g: { id: string }) => g.id)
    let memRows: ContentMembership[] = []
    if (groupIds.length > 0) {
      const gm = await supabase.from('group_memberships').select('group_id,team_id').in('group_id', groupIds)
      if (gm.error) setError(gm.error.message)
      memRows = (gm.data ?? []) as ContentMembership[]
    }

    setTeams((tr.data ?? []) as ContentTeam[])
    setGroups((tg.data ?? []) as ContentGroup[])
    setMemberships(memRows.filter((row) => teamIds.has(row.team_id)))
    setMatches((tm.data ?? []) as ContentMatch[])
    setLoading(false)
  }, [tournamentId])

  useEffect(() => {
    void load()
  }, [load])

  return { teams, groups, memberships, matches, loading, error, refresh: load }
}
