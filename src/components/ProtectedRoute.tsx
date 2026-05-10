import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SupabaseConfigMissing } from './SupabaseConfigMissing'
import { isSupabaseConfigured } from '../lib/supabase'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
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
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
