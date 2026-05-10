import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { absoluteUrl, ownerLoginPath } from '../config/paths'
import { supabase } from '../lib/supabase'

type ProvisionResponse =
  | { ok: true; email: string; password: string; organizerId: string }
  | { ok: false; error: string }

export function OwnerPortalPage() {
  const { signOut, user } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [lastOk, setLastOk] = useState<ProvisionResponse & { ok: true } | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setErr(null)
    setLastOk(null)
    setBusy(true)

    const body = {
      email: email.trim(),
      organizerName: orgName.trim(),
      password: password.trim() || null,
    }

    const { data, error: fnErr } = await supabase.functions.invoke<ProvisionResponse>(
      'provision-organizer',
      { body },
    )

    setBusy(false)

    if (fnErr) {
      setErr(fnErr.message)
      return
    }

    if (!data || typeof data !== 'object' || !('ok' in data)) {
      setErr('Risposta non valida dalla funzione (è deployata provision-organizer?)')
      return
    }

    if (!data.ok) {
      setErr(data.error ?? 'Errore')
      return
    }

    setLastOk(data)
    setOrgName('')
    setEmail('')
    setPassword('')
  }

  return (
    <main className="page">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Portale proprietario</p>
          <h1>Nuovo organizzatore</h1>
          <p className="meta">
            Il tuo account <code>{user?.email}</code>
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            Esci
          </button>
        </div>
      </header>

      <section className="card form-card">
        <p className="lede small">
          Genera un account che useranno gli organizzatori su <code>/admin/login</code>. Loro
          creano poi il torneo (nome, slug, colori, dominio, …). Serve la Edge Function{' '}
          <code>provision-organizer</code> deployata su Supabase.
        </p>

        <form className="form grid-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Nome organizzatore / società (etichetta interna)</span>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="ASD Birbantini"
              required
            />
          </label>
          <label className="field">
            <span>Email di accesso per l’organizzatore</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="presidente@asd.it"
              required
            />
          </label>
          <label className="field">
            <span>Password (opzionale)</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Lascia vuoto per generarne una automaticamente"
              autoComplete="off"
            />
            <span className="field-hint">Se la lasci vuota, la password viene generata e mostrata sotto.</span>
          </label>
          {err ? <p className="form-error">{err}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creazione…' : 'Genera credenziali'}
          </button>
        </form>
      </section>

      {lastOk ? (
        <section className="card owner-result">
          <h2>Credenziali da inviare</h2>
          <p className="lede small">Copia e incolla in un canale sicuro (mai in chat pubblica).</p>
          <dl className="cred-list">
            <div>
              <dt>URL solo per te (genera altre credenziali)</dt>
              <dd>
                <code>{absoluteUrl(ownerLoginPath)}</code>
              </dd>
            </div>
            <div>
              <dt>URL login organizzatore</dt>
              <dd>
                <code>{absoluteUrl('/admin/login')}</code>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <code>{lastOk.email}</code>
              </dd>
            </div>
            <div>
              <dt>Password</dt>
              <dd>
                <code className="secret-block">{lastOk.password}</code>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      <p className="foot-note">
        <Link to="/">Home pubblica</Link>
      </p>
    </main>
  )
}
