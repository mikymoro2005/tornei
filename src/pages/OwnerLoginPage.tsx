import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SupabaseConfigMissing } from '../components/SupabaseConfigMissing'
import { ownerPortalPath } from '../config/paths'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function OwnerLoginPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <main className="page center">
        <p>Caricamento…</p>
      </main>
    )
  }

  if (!isSupabaseConfigured || !supabase) {
    return <SupabaseConfigMissing title="Login non disponibile (portale gestore)" />
  }

  if (session) {
    return <Navigate to={ownerPortalPath} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const client = supabase
    if (!client) return
    setError(null)
    setSubmitting(true)
    const { error: signErr } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSubmitting(false)
    if (signErr) {
      setError(signErr.message)
      return
    }
    navigate(ownerPortalPath, { replace: true })
  }

  return (
    <main className="page narrow">
      <p className="eyebrow">Gestore piattaforma</p>
      <h1>Portale proprietario</h1>
      <p className="lede">
        Solo per te: dopo l’accesso puoi generare credenziali per gli organizzatori. Non condividere
        questo link.
      </p>

      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>La tua email (account Supabase)</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Accesso…' : 'Entra'}
        </button>
      </form>

      <p className="foot-note">
        <Link to="/">← Home pubblica</Link>
      </p>
    </main>
  )
}
