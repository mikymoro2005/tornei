import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { usePlatformOperator } from '../hooks/usePlatformOperator'
import { ownerLoginPath } from '../config/paths'
import { isSupabaseConfigured } from '../lib/supabase'
import { SupabaseConfigMissing } from './SupabaseConfigMissing'

export function ProtectedOwnerRoute({ children }: { children: ReactNode }) {
  const { session, user, loading: authLoading } = useAuth()
  const { isOperator, loading: opLoading } = usePlatformOperator(user)

  if (authLoading || (session && opLoading)) {
    return (
      <main className="page center">
        <p>Verifica accesso…</p>
      </main>
    )
  }

  if (!isSupabaseConfigured) {
    return <SupabaseConfigMissing title="Supabase non configurato" />
  }

  if (!session) {
    return <Navigate to={ownerLoginPath} replace />
  }

  if (!isOperator) {
    return (
      <main className="page narrow">
        <h1>Accesso negato</h1>
        <p className="lede">
          Questo portale è solo per il gestore della piattaforma. Il tuo utente non è in{' '}
          <code>platform_operators</code> (inserisci il tuo UUID in SQL una tantum).
        </p>
        <Link to="/">← Home</Link>
      </main>
    )
  }

  return <>{children}</>
}
