import { Link } from 'react-router-dom'
import { getSiteBaseUrl } from '../config/paths'

export function HomePage() {
  const siteUrl = getSiteBaseUrl()

  return (
    <main className="page">
      <p className="eyebrow">Tornei</p>
      <h1>Calcio a 5 · 6 · 7 — live score, gironi e tabellone</h1>
      <p className="lede">
        Segui partite e classifiche in tempo reale. Ogni manifestazione può avere il proprio link e i
        propri colori, tutta la piattaforma gira sulla stessa app.
      </p>
      {siteUrl ? (
        <p className="lede subtle">
          Sito pubblico: <code>{siteUrl}</code> — pagina di un torneo:{' '}
          <code>{siteUrl}/t/mio-torneo</code> (es. <code>mio-torneo</code> = slug)
          . Gli organizzatori usano il pulsante <strong>Login organizzatori</strong>.
        </p>
      ) : (
        <p className="lede subtle">
          Imposta <code>VITE_APP_URL</code> in produzione così qui compare l&apos;URL completo dei
          link.
        </p>
      )}
      <div className="actions">
        <Link className="btn btn-primary" to="/t/demo-estate-2026">
          Vedi torneo demo
        </Link>
        <Link className="btn btn-ghost" to="/admin/login">
          Login organizzatori
        </Link>
      </div>
      <p className="foot-note muted">
        <a href="https://supabase.com/docs/guides/realtime" target="_blank" rel="noreferrer">
          Supabase Realtime
        </a>
        {' · '}Domini dedicati ai singoli tornei: configurazione <code>custom_domain</code> dalla
        dashboard organizzatori.
      </p>
    </main>
  )
}
