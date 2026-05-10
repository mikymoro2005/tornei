/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Es. https://tornei.vercel.app (nome progetto Vercel «tornei»). */
  readonly VITE_APP_URL?: string
  /** Default `/owner` → https://tornei.vercel.app/owner/login */
  readonly VITE_OWNER_BASE_PATH?: string
  /** Es. tornei.vercel.app — host che mostrano sempre la home marketing su `/`. */
  readonly VITE_PRIMARY_SITE_HOSTS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
