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
