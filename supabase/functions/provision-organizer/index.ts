import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function generatePassword(length = 14) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const out: string[] = []
  const buf = new Uint8Array(length)
  crypto.getRandomValues(buf)
  for (let i = 0; i < length; i++) out.push(chars[buf[i]! % chars.length]!)
  return out.join('')
}

type Body = {
  email?: string
  organizerName?: string
  password?: string | null
}

type OkResp = {
  ok: true
  email: string
  password: string
  organizerId: string
}

type ErrResp = { ok: false; error: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method not allowed' } satisfies ErrResp)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    return json({ ok: false, error: 'server misconfigured' } satisfies ErrResp)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ ok: false, error: 'non autenticato' } satisfies ErrResp)
  }

  const token = authHeader.slice(7)
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !authData.user) {
    return json({ ok: false, error: 'sessione non valida' } satisfies ErrResp)
  }

  const { data: op, error: opErr } = await admin
    .from('platform_operators')
    .select('user_id')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (opErr) {
    return json({ ok: false, error: opErr.message } satisfies ErrResp)
  }
  if (!op) {
    return json({ ok: false, error: 'non autorizzato come gestore piattaforma' } satisfies ErrResp)
  }

  let parsed: Body
  try {
    parsed = (await req.json()) as Body
  } catch {
    return json({ ok: false, error: 'body JSON non valido' } satisfies ErrResp)
  }

  const email = parsed.email?.trim().toLowerCase()
  const organizerName = parsed.organizerName?.trim()
  const customPassword =
    parsed.password?.trim().length !== 0 ? parsed.password!.trim() : null

  if (!email?.includes('@')) {
    return json({ ok: false, error: 'email non valida' } satisfies ErrResp)
  }
  if (!organizerName) {
    return json({ ok: false, error: 'nome organizzatore obbligatorio' } satisfies ErrResp)
  }

  const password = customPassword ?? generatePassword()

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createErr || !newUser.user) {
    return json({
      ok: false,
      error: createErr?.message ?? 'creazione utente fallita',
    } satisfies ErrResp)
  }

  const { data: org, error: orgErr } = await admin
    .from('organizers')
    .insert({ name: organizerName })
    .select('id')
    .single()

  if (orgErr || !org) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return json({
      ok: false,
      error: orgErr?.message ?? 'creazione organizer fallita',
    } satisfies ErrResp)
  }

  const { error: memErr } = await admin.from('organizer_members').insert({
    organizer_id: org.id,
    user_id: newUser.user.id,
    role: 'owner',
  })

  if (memErr) {
    await admin.from('organizers').delete().eq('id', org.id)
    await admin.auth.admin.deleteUser(newUser.user.id)
    return json({ ok: false, error: memErr.message } satisfies ErrResp)
  }

  return json({
    ok: true,
    email,
    password,
    organizerId: org.id,
  } satisfies OkResp)
})
