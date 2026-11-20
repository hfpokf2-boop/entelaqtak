-- Private owner allowlist and privacy-conscious visitor session analytics.
create table if not exists public.site_admins (
  email text primary key check (position('@' in email) > 1),
  created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.site_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

create table if not exists public.visitor_sessions (
  session_id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  visitor_email text,
  page_path text not null default '/',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  ended_at timestamptz,
  user_agent text,
  referrer text,
  constraint visitor_email_length check (visitor_email is null or length(visitor_email) <= 254),
  constraint visitor_path_length check (length(page_path) <= 500),
  constraint visitor_agent_length check (user_agent is null or length(user_agent) <= 500),
  constraint visitor_referrer_length check (referrer is null or length(referrer) <= 1000)
);
create index if not exists visitor_sessions_last_seen_idx on public.visitor_sessions(last_seen desc);
create index if not exists visitor_sessions_first_seen_idx on public.visitor_sessions(first_seen desc);
alter table public.visitor_sessions enable row level security;

drop policy if exists "Visitors can start own anonymous session" on public.visitor_sessions;
create policy "Visitors can start own anonymous session"
on public.visitor_sessions for insert to anon, authenticated
with check (
  (user_id is null and visitor_email is null)
  or (user_id = (select auth.uid()) and visitor_email = (auth.jwt() ->> 'email'))
);
drop policy if exists "Visitors can update own session heartbeat" on public.visitor_sessions;
create policy "Visitors can update own session heartbeat"
on public.visitor_sessions for update to anon, authenticated
using (session_id is not null)
with check (
  (user_id is null and visitor_email is null)
  or (user_id = (select auth.uid()) and visitor_email = (auth.jwt() ->> 'email'))
);
drop policy if exists "Only site admins can read visitor sessions" on public.visitor_sessions;
create policy "Only site admins can read visitor sessions"
on public.visitor_sessions for select to authenticated
using (public.is_site_admin());

revoke all on public.visitor_sessions from public;
grant insert, update on public.visitor_sessions to anon, authenticated;
grant select on public.visitor_sessions to authenticated;
