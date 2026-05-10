/**
 * Base path del portale dove generi credenziali (solo tu): default `/owner`.
 * In produzione imposta es. `/gestione-xyz` tramite `VITE_OWNER_BASE_PATH` (stesso deploy / dominio).
 */
function normalizeOwnerBase(raw: string | undefined): string {
  let b = (raw?.trim() || '/owner').replace(/\/+$/, '')
  if (!b.startsWith('/')) b = `/${b}`
  if (b === '') b = '/owner'
  return b
}

export const OWNER_PORTAL_BASE = normalizeOwnerBase(import.meta.env.VITE_OWNER_BASE_PATH)

export const ownerLoginPath = `${OWNER_PORTAL_BASE}/login`

export const ownerPortalPath = OWNER_PORTAL_BASE

/** URL assoluto (es. https://tornei.vercel.app) per link nei testi; in dev fallback su window.location. */
export function getSiteBaseUrl(): string {
  const configured = import.meta.env.VITE_APP_URL as string | undefined
  const trimmed = configured?.trim().replace(/\/$/, '')
  if (trimmed) return trimmed
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '')
  return ''
}

export function absoluteUrl(path: string): string {
  const base = getSiteBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
