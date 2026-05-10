/**
 * Crea utente Auth + organizer + organizer_members (owner).
 * Preferisci il portale web `/owner/login` se hai deployato la Edge Function provision-organizer.
 *
 * NON usare mai la service role key nel frontend o in repo pubblico.
 *
 * Variabili (caricate da `.env.provision` o `.env` in root progetto):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PUBLIC_APP_URL   (default https://tornei.vercel.app)
 *   OWNER_BASE_PATH  (opzionale, default /owner → portale credenziali = PUBLIC_APP_URL + path)
 *
 * Uso:
 *   npx tsx scripts/provision-organizer.ts --email=club@example.com --org="ASD Riviera"
 *
 * Password: passa --password=TuaScelta oppure viene generata.
 */

import { randomBytes } from 'node:crypto'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.provision' })
config({ path: '.env' })

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]
  return undefined
}

function randomPassword() {
  return randomBytes(12).toString('base64url').slice(0, 18)
}

async function main() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicAppUrl =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://tornei.vercel.app'
  let ownerPath = (
    process.env.OWNER_BASE_PATH ||
    process.env.VITE_OWNER_BASE_PATH ||
    '/owner'
  ).trim()
  if (!ownerPath.startsWith('/')) ownerPath = `/${ownerPath}`
  ownerPath = ownerPath.replace(/\/+$/, '') || '/owner'
  const ownerLoginUrl = `${publicAppUrl}${ownerPath}/login`

  const email = arg('email')
  const orgName = arg('org') ?? 'Nuovo organizzatore'
  const password = arg('password') ?? randomPassword()

  if (!url || !serviceKey) {
    console.error(
      'Manca SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Aggiungi .env.provision nella root del repo (gitignored).',
    )
    process.exit(1)
  }
  if (!email) {
    console.error(
      'Uso: npx tsx scripts/provision-organizer.ts --email=club@example.com --org="Nome PO" [--password=...]',
    )
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (userErr || !created.user) {
    console.error('Errore creazione utente:', userErr?.message)
    process.exit(1)
  }

  const { data: org, error: orgErr } = await admin
    .from('organizers')
    .insert({ name: orgName })
    .select('id')
    .single()

  if (orgErr || !org) {
    console.error('Errore creazione organizzatore:', orgErr?.message)
    process.exit(1)
  }

  const { error: memErr } = await admin.from('organizer_members').insert({
    organizer_id: org.id,
    user_id: created.user.id,
    role: 'owner',
  })

  if (memErr) {
    console.error('Errore collegamento membership:', memErr.message)
    process.exit(1)
  }

  console.log('')
  console.log('--- Da inviare al cliente (una tantum) ---')
  console.log('URL sito (Vercel):', publicAppUrl)
  console.log('Il tuo portale (solo te, generare credenziali):', ownerLoginUrl)
  console.log('Login organizzatori:                          ', `${publicAppUrl}/admin/login`)
  console.log('Email:                                        ', email)
  console.log('Password:                                      ', password)
  console.log('')
  console.log('Il deploy su Vercel è indipendente da questa password: aggiorna solo env Supabase sul progetto Vercel.')
  console.log('')
}

void main()
