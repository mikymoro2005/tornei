import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import type { TournamentRow } from '../hooks/useTournamentBySlug'

type OrgRow = { id: string; name: string }

type MembershipRow = {
  organizer_id: string
  role: string
  organizers: OrgRow | null
}

export function AdminDashboardPage() {
  const { signOut, user } = useAuth()
  const [memberships, setMemberships] = useState<MembershipRow[]>([])
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  const [pickedOrganizerId, setPickedOrganizerId] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [format, setFormat] = useState<5 | 6 | 7>(7)
  const [primary, setPrimary] = useState('#15803d')
  const [secondary, setSecondary] = useState('#eab308')
  const [customDomain, setCustomDomain] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async () => {
    if (!supabase || !user) return
    setLoadError(null)
    setBusy(true)
    const { data: mem, error: mErr } = await supabase
      .from('organizer_members')
      .select('organizer_id, role, organizers ( id, name )')
      .eq('user_id', user.id)

    if (mErr) {
      setLoadError(mErr.message)
      setBusy(false)
      return
    }

    const rows = (mem ?? []) as MembershipRow[]
    setMemberships(rows)

    const orgIds = rows.map((r) => r.organizer_id)
    if (orgIds.length === 0) {
      setTournaments([])
      setBusy(false)
      return
    }

    const { data: t, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .in('organizer_id', orgIds)
      .order('created_at', { ascending: false })

    if (tErr) {
      setLoadError(tErr.message)
    } else {
      setTournaments((t ?? []) as TournamentRow[])
    }
    setBusy(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const targetOrganizerId = pickedOrganizerId ?? memberships[0]?.organizer_id ?? ''

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !targetOrganizerId) return
    setCreateError(null)
    setCreating(true)
    const { error: rpcErr } = await supabase.rpc('create_tournament_with_owner', {
      p_organizer_id: targetOrganizerId,
      p_slug: slug,
      p_name: name,
      p_location: location,
      p_format: format,
      p_theme_primary: primary,
      p_theme_secondary: secondary,
      p_is_public: true,
      p_custom_domain: customDomain.trim() || null,
    })
    setCreating(false)
    if (rpcErr) {
      setCreateError(rpcErr.message)
      return
    }
    setSlug('')
    setName('')
    setLocation('')
    setCustomDomain('')
    await refresh()
  }

  return (
    <main className="page">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Dashboard organizzatore</p>
          <h1>I tuoi tornei</h1>
          <p className="meta">
            Account <code>{user?.email}</code>
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            Esci
          </button>
        </div>
      </header>

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {busy ? (
        <p>Caricamento dati…</p>
      ) : memberships.length === 0 ? (
        <section className="card">
          <h2>Nessun organizzatore collegato</h2>
          <p className="lede">
            L’account non è ancora associato a un organizzatore. Chi gestisce la piattaforma deve
            eseguire lo script <code>npm run provision:organizer</code> con la service role key e
            indicare la tua email.
          </p>
        </section>
      ) : (
        <>
          <section className="card form-card">
            <h2>Crea un nuovo torneo</h2>
            <p className="lede small">
              URL condivisibile: <code>tornei.vercel.app/t/slug</code> (stesso progetto), oppure la{' '}
              <strong>root</strong> <code>/</code> su un dominio dedicato che imposti sotto (es.{' '}
              <code>birbantini.tuobrand.it</code>) — stesso Supabase, campo{' '}
              <code>custom_domain</code> uguale all’hostname.
            </p>
            <form className="form grid-form" onSubmit={onCreate}>
              {memberships.length > 1 ? (
                <label className="field">
                  <span>Organizzatore</span>
                  <select
                    value={targetOrganizerId}
                    onChange={(e) => setPickedOrganizerId(e.target.value)}
                    required
                  >
                    {memberships.map((m) => (
                      <option key={m.organizer_id} value={m.organizer_id}>
                        {m.organizers?.name ?? m.organizer_id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="field">
                <span>Slug URL (es. estate-lignano-2026)</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="estate-lignano-2026"
                  required
                />
              </label>
              <label className="field">
                <span>Dominio pubblico (opzionale, solo hostname)</span>
                <input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="birbantini.tornei-tuoi.it"
                  autoComplete="off"
                />
                <span className="field-hint">
                  Deve coincidere con DNS/Vercel. Non usare <code>https://</code>. Un torneo = un
                  dominio (univoco in Supabase).
                </span>
              </label>
              <label className="field">
                <span>Nome torneo</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="field">
                <span>Località</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label className="field">
                <span>Formato</span>
                <select
                  value={format}
                  onChange={(e) => setFormat(Number(e.target.value) as 5 | 6 | 7)}
                >
                  <option value={5}>Calcio a 5</option>
                  <option value={6}>Calcio a 6</option>
                  <option value={7}>Calcio a 7</option>
                </select>
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Colore primario</span>
                  <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
                </label>
                <label className="field">
                  <span>Colore secondario</span>
                  <input
                    type="color"
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                  />
                </label>
              </div>
              {createError ? <p className="form-error">{createError}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? 'Creazione…' : 'Crea torneo'}
              </button>
            </form>
          </section>

          <section className="card">
            <h2>Tornei</h2>
            {tournaments.length === 0 ? (
              <p>Nessun torneo ancora.</p>
            ) : (
              <ul className="tournament-list">
                {tournaments.map((t) => (
                  <li key={t.id}>
                    <div>
                      <strong>{t.name}</strong>
                      <span className="meta">
                        {' '}
                        · <code>{t.slug}</code> · a {t.format}
                        {t.custom_domain ? (
                          <>
                            {' '}
                            · link bio:{' '}
                            <code>
                              https://{t.custom_domain}</code>
                          </>
                        ) : null}
                      </span>
                    </div>
                    <div className="list-actions">
                      <Link className="btn btn-ghost btn-sm" to={`/t/${t.slug}`}>
                        Sito pubblico
                      </Link>
                      <Link className="btn btn-primary btn-sm" to={`/t/${t.slug}/admin`}>
                        Staff / risultati
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
