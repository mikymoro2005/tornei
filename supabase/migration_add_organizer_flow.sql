-- Esegui su Supabase se hai già applicato una versione precedente di schema.sql
-- senza organizer_members / politiche org / RPC.

create table if not exists organizer_members (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid not null references organizers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin')),
  created_at timestamptz default now(),
  unique (organizer_id, user_id)
);

create index if not exists idx_organizer_members_user on organizer_members (user_id);

alter table organizers enable row level security;
alter table organizer_members enable row level security;

drop policy if exists organizers_member_read on organizers;
create policy organizers_member_read on organizers
  for select using (
    exists (
      select 1 from organizer_members m
      where m.organizer_id = organizers.id and m.user_id = auth.uid()
    )
  );

drop policy if exists organizer_members_self_read on organizer_members;
create policy organizer_members_self_read on organizer_members
  for select using (user_id = auth.uid());

drop policy if exists tournaments_org_read on tournaments;
create policy tournaments_org_read on tournaments
  for select using (
    exists (
      select 1 from organizer_members m
      where m.organizer_id = tournaments.organizer_id and m.user_id = auth.uid()
    )
  );

drop policy if exists tournaments_org_insert on tournaments;
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

drop policy if exists tournament_staff_insert_by_org on tournament_staff;
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

drop policy if exists tournament_staff_insert_by_staff on tournament_staff;
create policy tournament_staff_insert_by_staff on tournament_staff
  for insert with check (
    exists (
      select 1 from tournament_staff s
      where s.tournament_id = tournament_staff.tournament_id
        and s.user_id = auth.uid()
        and s.role in ('owner', 'admin')
    )
  );

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
