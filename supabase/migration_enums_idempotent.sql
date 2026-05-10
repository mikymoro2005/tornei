-- Esegui solo se compare: ERROR: type "match_phase" already exists
-- (oppure usa schema.sql aggiornato che include già questi blocchi.)

do $$ begin
  create type match_phase as enum ('group', 'knockout', 'placement');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type match_status as enum ('scheduled', 'live', 'finished', 'cancelled');
exception
  when duplicate_object then null;
end $$;
