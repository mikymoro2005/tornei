-- Tornei multi-tenant: eseguire su Supabase (SQL Editor) o tramite migrazioni.
-- Abilita Realtime dopo la creazione: Dashboard → Database → Replication → aggiungi le tabelle
--   tournaments, matches, goals (eventi gol in live).

create extension if not exists "uuid-ossp";

-- Organizzatori / clienti (chi ti paga il servizio sito torneo).
create table if not exists organizers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  billing_email text,
  created_at timestamptz default now()
);

-- Chi può creare tornei per un organizzatore (utente + password che generi tu).
create table if not exists organizer_members (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid not null references organizers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin')),
  created_at timestamptz default now(),
  unique (organizer_id, user_id)
);

create index if not exists idx_organizer_members_user on organizer_members (user_id);

-- Account piattaforma (solo tu): una riga = utente che può aprire /owner e generare organizzatori.
-- Dopo esserti registrato in Auth, esegui: insert into platform_operators (user_id) values ('<tuo-uuid>');
create table if not exists platform_operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists tournaments (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid references organizers (id) on delete set null,
  slug text not null unique,
  name text not null,
  location text,
  format smallint not null check (format in (5, 6, 7)),
  starts_on date,
  ends_on date,
  is_public boolean default true,
  theme_primary text default '#15803d',
  theme_secondary text default '#eab308',
  logo_url text,
  custom_domain text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tournaments_slug on tournaments (slug);
create index if not exists idx_tournaments_domain on tournaments (custom_domain) where custom_domain is not null;

create table if not exists tournament_staff (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'scorer')),
  created_at timestamptz default now(),
  unique (tournament_id, user_id)
);

create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  name text not null,
  short_name text,
  badge_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_teams_tournament on teams (tournament_id);

create table if not exists groups (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  label text not null,
  sort_order int default 0
);

create index if not exists idx_groups_tournament on groups (tournament_id);

create table if not exists group_memberships (
  group_id uuid not null references groups (id) on delete cascade,
  team_id uuid not null references teams (id) on delete cascade,
  primary key (group_id, team_id)
);

create type match_phase as enum ('group', 'knockout', 'placement');
create type match_status as enum ('scheduled', 'live', 'finished', 'cancelled');

create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  group_id uuid references groups (id) on delete set null,
  phase match_phase not null default 'group',
  round_label text,
  knockout_slot int,
  home_team_id uuid not null references teams (id) on delete restrict,
  away_team_id uuid not null references teams (id) on delete restrict,
  scheduled_at timestamptz,
  started_at timestamptz,
  status match_status not null default 'scheduled',
  home_score smallint default 0,
  away_score smallint default 0,
  current_minute smallint,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint different_teams check (home_team_id <> away_team_id)
);

create index if not exists idx_matches_tournament on matches (tournament_id);
create index if not exists idx_matches_status on matches (tournament_id, status);

create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches (id) on delete cascade,
  team_id uuid not null references teams (id) on delete cascade,
  minute smallint,
  scorer_label text,
  is_own_goal boolean default false,
  recorded_at timestamptz default now()
);

create index if not exists idx_goals_match on goals (match_id);

-- ─── RLS (estendi in base alle tue regole di invito utenti)

alter table organizers enable row level security;
alter table organizer_members enable row level security;
alter table platform_operators enable row level security;
alter table tournaments enable row level security;
alter table tournament_staff enable row level security;
alter table teams enable row level security;
alter table groups enable row level security;
alter table group_memberships enable row level security;
alter table matches enable row level security;
alter table goals enable row level security;

-- Lettura pubblica tornei visibili
create policy tournaments_public_read on tournaments
  for select using (is_public = true);

-- Staff: lettura propri tornei
create policy tournaments_staff_read on tournaments
  for select using (
    exists (
      select 1 from tournament_staff s
      where s.tournament_id = tournaments.id and s.user_id = auth.uid()
    )
  );

-- Solo owner/admin possono aggiornare metadati torneo (esempio)
create policy tournaments_staff_update on tournaments
  for update using (
    exists (
      select 1 from tournament_staff s
      where s.tournament_id = tournaments.id
        and s.user_id = auth.uid()
        and s.role in ('owner', 'admin')
    )
  );

-- Membri organizzatore: vedono e creano tornei per il proprio organizer_id
create policy organizers_member_read on organizers
  for select using (
    exists (
      select 1 from organizer_members m
      where m.organizer_id = organizers.id and m.user_id = auth.uid()
    )
  );

create policy organizer_members_self_read on organizer_members
  for select using (user_id = auth.uid());

create policy platform_operators_self_read on platform_operators
  for select using (user_id = auth.uid());

create policy tournaments_org_read on tournaments
  for select using (
    exists (
      select 1 from organizer_members m
      where m.organizer_id = tournaments.organizer_id and m.user_id = auth.uid()
    )
  );

create policy tournaments_org_insert on tournaments
  for insert with check (
    organizer_id is not null
    and exists (
      select 1 from organizer_members m
      where m.organizer_id = tournaments.organizer_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy teams_public_read on teams
  for select using (
    exists (select 1 from tournaments t where t.id = teams.tournament_id and t.is_public)
  );

create policy teams_staff_all on teams
  for all using (
    exists (
      select 1 from tournament_staff s
      where s.tournament_id = teams.tournament_id
        and s.user_id = auth.uid()
        and s.role in ('owner', 'admin')
    )
  );

create policy groups_public_read on groups
  for select using (
    exists (select 1 from tournaments t where t.id = groups.tournament_id and t.is_public)
  );

create policy groups_staff_all on groups
  for all using (
    exists (
      select 1 from tournament_staff s
      where s.tournament_id = groups.tournament_id
        and s.user_id = auth.uid()
        and s.role in ('owner', 'admin')
    )
  );

create policy group_memberships_public_read on group_memberships
  for select using (
    exists (
      select 1 from groups g
      join tournaments t on t.id = g.tournament_id
      where g.id = group_memberships.group_id and t.is_public
    )
  );

create policy group_memberships_staff_all on group_memberships
  for all using (
    exists (
      select 1 from groups g
      join tournament_staff s on s.tournament_id = g.tournament_id
      where g.id = group_memberships.group_id
        and s.user_id = auth.uid()
        and s.role in ('owner', 'admin')
    )
  );

create policy matches_public_read on matches
  for select using (
    exists (select 1 from tournaments t where t.id = matches.tournament_id and t.is_public)
  );

create policy matches_staff_write on matches
  for all using (
    exists (
      select 1 from tournament_staff s
      where s.tournament_id = matches.tournament_id
        and s.user_id = auth.uid()
        and s.role in ('owner', 'admin', 'scorer')
    )
  );

create policy goals_public_read on goals
  for select using (
    exists (
      select 1 from matches m
      join tournaments t on t.id = m.tournament_id
      where m.id = goals.match_id and t.is_public
    )
  );

create policy goals_staff_write on goals
  for all using (
    exists (
      select 1 from matches m
      join tournament_staff s on s.tournament_id = m.tournament_id
      where m.id = goals.match_id
        and s.user_id = auth.uid()
        and s.role in ('owner', 'admin', 'scorer')
    )
  );

-- tournament_staff: ogni utente vede solo le proprie righe
create policy staff_self_read on tournament_staff
  for select using (user_id = auth.uid());

-- Primo collegamento: membro org diventa owner del torneo appena creato
create policy tournament_staff_insert_by_org on tournament_staff
  for insert with check (
    user_id = auth.uid()
    and role in ('owner', 'admin', 'scorer')
    and exists (
      select 1 from tournaments t
      join organizer_members m on m.organizer_id = t.organizer_id
      where t.id = tournament_staff.tournament_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- Aggiungere altri operatori: solo owner/admin già iscritti al torneo
create policy tournament_staff_insert_by_staff on tournament_staff
  for insert with check (
    exists (
      select 1 from tournament_staff s
      where s.tournament_id = tournament_staff.tournament_id
        and s.user_id = auth.uid()
        and s.role in ('owner', 'admin')
    )
  );

-- Creazione atomica torneo + riga owner in tournament_staff (consigliata dalla dashboard)
create or replace function public.create_tournament_with_owner(
  p_organizer_id uuid,
  p_slug text,
  p_name text,
  p_location text,
  p_format smallint,
  p_theme_primary text default null,
  p_theme_secondary text default null,
  p_is_public boolean default true,
  p_custom_domain text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
  d text;
begin
  if auth.uid() is null then
    raise exception 'non autenticato';
  end if;
  if not exists (
    select 1 from organizer_members m
    where m.organizer_id = p_organizer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  ) then
    raise exception 'organizzatore non consentito';
  end if;
  if p_format not in (5, 6, 7) then
    raise exception 'formato non valido';
  end if;
  d := nullif(lower(trim(p_custom_domain)), '');
  insert into tournaments (
    organizer_id, slug, name, location, format,
    theme_primary, theme_secondary, is_public, custom_domain
  )
  values (
    p_organizer_id,
    lower(regexp_replace(trim(p_slug), '[[:space:]]+', '-', 'g')),
    trim(p_name),
    nullif(trim(p_location), ''),
    p_format,
    coalesce(nullif(trim(p_theme_primary), ''), '#15803d'),
    coalesce(nullif(trim(p_theme_secondary), ''), '#eab308'),
    coalesce(p_is_public, true),
    d
  )
  returning id into tid;
  insert into tournament_staff (tournament_id, user_id, role)
  values (tid, auth.uid(), 'owner');
  return tid;
end;
$$;

revoke all on function public.create_tournament_with_owner(uuid, text, text, text, smallint, text, text, boolean, text) from public;
grant execute on function public.create_tournament_with_owner(uuid, text, text, text, smallint, text, text, boolean, text) to authenticated;

comment on table tournaments is 'Un record per ogni torneo / sito white-label';
comment on column tournaments.slug is 'URL path: /t/{slug} o sottodominio';
comment on column tournaments.custom_domain is 'Dominio del cliente, risolto in app';
comment on table matches is 'Gironi e tabellone: phase + round_label + knockout_slot';
