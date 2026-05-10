import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
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
    return (
      <main className="page center">
        <h1>Supabase non configurato</h1>
        <p>Aggiungi <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (anche su Vercel).</p>
        <Link to="/">Home</Link>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
