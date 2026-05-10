# Far funzionare Tornei (Supabase + Vercel)

Il progetto pubblico è pensato sul deploy **https://tornei.vercel.app** (nome del progetto Vercel: **tornei**).

## 1. Database Supabase

1. Apri il progetto su [Supabase](https://supabase.com/dashboard).
2. **SQL Editor** → incolla ed esegui **tutto** `supabase/schema.sql` (database nuovo).

   Oppure applica le migrazioni dalla cartella `supabase/` se aggiorni un DB esistente.

3. **Prima volta – il tuo account “proprietario”**

   - Registra **il tuo** utente da **Authentication → Add user** (email + password) oppure con signup abilitata.
   - Copia il **UUID** utente (`auth.users`).
   - Esegui:

   ```sql
   insert into platform_operators (user_id)
   values ('INCOLLA-QUI-IL-TUO-UUID');
   ```

## 2. Edge Function `provision-organizer`

Serve per **generare credenziali dall’interfaccia** senza mettere la *service role* nel browser.

1. Installa [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Nella cartella del repo:

   ```bash
   supabase login
   supabase link --project-ref IL_TUO_REF
   npm run supabase:functions:deploy
   ```

   `--no-verify-jwt`: il token viene comunque validato **dentro** la funzione con `platform_operators`.

3. In Supabase → **Functions**, verifica `provision-organizer`.

## 3. Variabili ambiente (.env locale e Vercel)

Da `.env.example` → copia come `.env` e compila. Su **Vercel**, stesse chiavi sul progetto **tornei**:

| Variabile | Valore tipico |
|-----------|----------------|
| `VITE_SUPABASE_URL` | URL progetto Supabase |
| `VITE_SUPABASE_ANON_KEY` | chiave anon pubblica |
| **`VITE_APP_URL`** | `https://tornei.vercel.app` |
| **`VITE_OWNER_BASE_PATH`** | `/owner` → **https://tornei.vercel.app/owner/login** |
| **`VITE_PRIMARY_SITE_HOSTS`** | `tornei.vercel.app` (home marketing sulla root `/`) |

Il “dominio delle credenziali” non è un sito diverso: è **`tornei.vercel.app` + il path `/owner`** (o un path diverso che imposti solo con env).

### Provisioning solo da terminale

File `.env.provision` nella root:

- `PUBLIC_APP_URL=https://tornei.vercel.app`

## 4. Deploy Vercel

1. Nuovo progetto **tornei** (così ottieni `tornei.vercel.app`).
2. Build: `npm run build`, cartella output **dist**.
3. Imposta tutte le variabili `VITE_*` come sopra sia in **Production** che in **Preview** (deploy branch / PR usano Preview: senza chiavi vedrai pagine vuote senza Supabase).

`vercel.json` è già impostato per le route SPA.

Sulla root `/`, qualunque host `*.vercel.app` è trattato come **hub pubblica Tornei**, non si cerca più `custom_domain` su quel tipo di URL (solo per domini custom dei clienti).

## 5. Uso quotidiano

- **Tu:** **https://tornei.vercel.app/owner/login** (generi credenziali organizzatori).
- **Organizzatori:** **https://tornei.vercel.app/admin/login** poi dashboard `/admin`.
