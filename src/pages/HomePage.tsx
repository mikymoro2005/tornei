import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main className="page">
      <p className="eyebrow">Tornei</p>
      <h1>Calcio a 5 · 6 · 7 — live score, gironi, tabellone</h1>
      <p className="lede">
        Il deploy principale è <code>https://tornei.vercel.app</code> (progetto Vercel chiamato{' '}
        <strong>tornei</strong>). Ogni torneo ha colori e dati sullo stesso Supabase. Per le bio
        social puoi usare un dominio dedicato tipo <code>birbantini.esempio.it</code> (DNS + campo{' '}
        <code>custom_domain</code> sul torneo): aprendo quel dominio si vede{' '}
        <strong>solo quel torneo</strong>.
      </p>
      <p className="lede subtle">
        Su Vercel solo un indirizzo <code>*.vercel.app</code> per questo progetto:{' '}
        <code>tornei.vercel.app</code>. I link pubblici restano{' '}
        <code>tornei.vercel.app/t/slug</code>; per un link “solo Birbantini” serve un dominio custom
        oppure lo slug.
      </p>
      <div className="actions">
        <Link className="btn btn-primary" to="/t/demo-estate-2026">
          Vedi torneo demo
        </Link>
        <Link className="btn btn-ghost" to="/admin/login">
          Login organizzatori
        </Link>
        <a
          className="btn btn-ghost"
          href="https://supabase.com/docs/guides/realtime"
          target="_blank"
          rel="noreferrer"
        >
          Realtime Supabase
        </a>
      </div>
    </main>
  )
}
