-- Estende create_tournament_with_owner con dominio pubblico (hostname tipo birbantini.tuo-dominio.it)

drop function if exists public.create_tournament_with_owner(uuid, text, text, text, smallint, text, text, boolean);

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
