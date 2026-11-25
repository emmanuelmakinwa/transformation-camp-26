-- Preserve existing minister registrations while allowing registrants to choose multiple sessions.
-- Review before applying. Existing single-session columns remain for backward compatibility.
-- This migration has not been applied to any shared or production database.

alter table public.minister_registrations
  add column if not exists session_keys text[],
  add column if not exists session_labels text[];

update public.minister_registrations
set session_keys = array[session_key],
    session_labels = array[session_label]
where session_keys is null or session_labels is null;

alter table public.minister_registrations
  alter column session_keys set not null,
  alter column session_labels set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'minister_registrations_session_selection_check'
      and conrelid = 'public.minister_registrations'::regclass
  ) then
    alter table public.minister_registrations
      add constraint minister_registrations_session_selection_check check (
        cardinality(session_keys) between 1 and 7
        and session_keys <@ array['session-1','session-2','session-3','session-4','session-5','session-6','session-7']::text[]
        and cardinality(session_labels) = cardinality(session_keys)
      );
  end if;
end
$$;
