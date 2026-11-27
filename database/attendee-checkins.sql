-- Event attendance is stored separately from the source registration records.
create table if not exists public.attendee_checkins (
  id uuid primary key default gen_random_uuid(),
  general_registration_id uuid references public.registrations(id) on delete restrict,
  minister_registration_id uuid references public.minister_registrations(id) on delete restrict,
  session_key text not null check (session_key in ('session-1','session-2','session-3','session-4','session-5','session-6','session-7')),
  checked_in_at timestamptz not null default now(),
  checked_in_by text not null,
  constraint attendee_checkins_exactly_one_registration check (
    (general_registration_id is not null and minister_registration_id is null)
    or (general_registration_id is null and minister_registration_id is not null)
  )
);

create unique index if not exists attendee_checkins_general_session_uidx
  on public.attendee_checkins (general_registration_id, session_key)
  where general_registration_id is not null;

create unique index if not exists attendee_checkins_minister_session_uidx
  on public.attendee_checkins (minister_registration_id, session_key)
  where minister_registration_id is not null;

create index if not exists attendee_checkins_session_checked_in_idx
  on public.attendee_checkins (session_key, checked_in_at desc);

alter table public.attendee_checkins enable row level security;
revoke all on table public.attendee_checkins from public, anon, authenticated;
grant all on table public.attendee_checkins to service_role;
comment on table public.attendee_checkins is 'Private event attendance records; accessed only by the authenticated server-side admin API.';
