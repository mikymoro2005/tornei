import { Link } from 'react-router-dom'

type Props = {
  /** Titolo pagina */
  title?: string
}

export function SupabaseConfigMissing({ title = 'Configurazione mancante' }: Props) {
  return (
    <main className="page narrow">
      <h1>{title}</h1>
      <p className="lede">
        L’app è stata pubblicata <strong>senza</strong> le chiavi Supabase nel momento del{' '}
        <strong>build</strong>. Vite le legge solo da variabili che iniziano con{' '}
        <code>VITE_</code>.
      </p>
      <section className="card">
        <h2>Su Vercel (produzione / preview)</h2>
        <ol className="list numbered">
          <li>
            Apri il progetto → <strong>Settings</strong> →{' '}
            <strong>
              <a href="https://vercel.com/docs/environment-variables" target="_blank" rel="noreferrer">
                Environment Variables
              </a>
            </strong>
            .
          </li>
          <li>
            Aggiungi due variabili (stessi valori che trovi su Supabase →{' '}
            <strong>Project Settings → API</strong>):
            <ul className="list tight">
              <li>
                <code>VITE_SUPABASE_URL</code> → <strong>Project URL</strong>
              </li>
              <li>
                <code>VITE_SUPABASE_ANON_KEY</code> → <strong>anon public</strong>{' '}
                (publishable / JWT, va bene comunque sia la chiave “publishable”).
              </li>
            </ul>
          </li>
          <li>
            Seleziona <strong>Production</strong>, <strong>Preview</strong> e dove serve anche{' '}
            <strong>Development</strong> (per i deploy branch).
          </li>
          <li>
            <strong>Deployments</strong> → sull&apos;ultimo deploy → ⋯ → <strong>Redeploy</strong>.
            Le variabili <code>VITE_*</code> sono lette alla build; senza redeploy il sito resta senza login.
          </li>
        </ol>
      </section>
      <section className="card">
        <h2>In locale</h2>
        <p className="lede small">
          Copia <code>.env.example</code> in <code>.env</code> e incolla URL + anon key, poi{' '}
          <code>npm run dev</code>.
        </p>
      </section>
      <p className="foot-note">
        <Link to="/">← Home</Link>
      </p>
    </main>
  )
}
