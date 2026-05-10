/**
 * Hostname “di vetrina” (app principale). Gli altri host si risolvono su tournaments.custom_domain.
 * Esempio: VITE_PRIMARY_SITE_HOSTS=localhost,127.0.0.1,mio-progetto.vercel.app
 */
export function getPrimarySiteHosts(): Set<string> {
  const raw = import.meta.env.VITE_PRIMARY_SITE_HOSTS as string | undefined
  const fromEnv = raw
    ? raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : []
  const fallback = ['localhost', '127.0.0.1']
  return new Set([...fallback, ...fromEnv])
}

export function isPrimarySiteHostname(hostname: string): boolean {
  return getPrimarySiteHosts().has(hostname.toLowerCase())
}
