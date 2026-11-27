-- Database-backed administrator roles. All access is performed by trusted server routes.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('super_admin', 'checkin_staff')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_email_lowercase check (email = lower(email))
);

create unique index if not exists admin_users_email_unique on public.admin_users (lower(email));
create index if not exists admin_users_active_role_idx on public.admin_users (role) where is_active = true;

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant all on table public.admin_users to service_role;

comment on table public.admin_users is
  'Server-managed admin identities and roles. Never authorize from user-editable metadata or client-side role claims.';

-- Enforce the last-active-Super-Admin invariant inside the database as well as the API.
-- The advisory transaction lock serializes concurrent role/deactivation changes.
create or replace function public.guard_last_active_super_admin()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'super_admin' and old.is_active then
      perform pg_advisory_xact_lock(hashtext('public.admin_users.last_active_super_admin'));
      if not exists (
        select 1 from public.admin_users
        where role = 'super_admin' and is_active = true and user_id <> old.user_id
      ) then
        raise exception 'The last active Super Admin cannot be removed'
          using errcode = '23514';
      end if;
    end if;
    return old;
  end if;

  if old.role = 'super_admin' and old.is_active
     and (new.role <> 'super_admin' or new.is_active = false) then
    perform pg_advisory_xact_lock(hashtext('public.admin_users.last_active_super_admin'));
    if not exists (
      select 1 from public.admin_users
      where role = 'super_admin' and is_active = true and user_id <> old.user_id
    ) then
      raise exception 'The last active Super Admin cannot be demoted or deactivated'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_last_active_super_admin() from public, anon, authenticated;
grant execute on function public.guard_last_active_super_admin() to service_role;

drop trigger if exists admin_users_guard_last_super_admin on public.admin_users;
create trigger admin_users_guard_last_super_admin
before update or delete on public.admin_users
for each row execute function public.guard_last_active_super_admin();
