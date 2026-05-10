import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SupabaseConfigMissing } from '../components/SupabaseConfigMissing'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function AdminLoginPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

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
    return <SupabaseConfigMissing title="Login non disponibile" />
  }

  if (session) {
    return <Navigate to={from} replace />
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
    navigate(from, { replace: true })
  }

  return (
    <main className="page narrow">
      <p className="eyebrow">Organizzatori</p>
      <h1>Accedi alla dashboard</h1>
      <p className="lede">
        Sei un <strong>organizzatore</strong>: usa email e password che ti ha mandato il gestore
        della piattaforma. Qui crei il torneo (nome, slug, colori…); il portale proprietario è
        un’area separata.
      </p>

      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
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
        <Link to="/">← Torna alla home</Link>
      </p>
    </main>
  )
}
