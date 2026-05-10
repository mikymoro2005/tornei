-- Portale proprietario (/owner): solo user_id qui possono creare credenziali organizzatori (via Edge Function).

create table if not exists platform_operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz default now()
);

alter table platform_operators enable row level security;

drop policy if exists platform_operators_self_read on platform_operators;
create policy platform_operators_self_read on platform_operators
  for select using (user_id = auth.uid());

-- Una tantum dopo il tuo signup in Auth Users (Dashboard → Authentication → Users → copia UUID):
-- insert into platform_operators (user_id) values ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
