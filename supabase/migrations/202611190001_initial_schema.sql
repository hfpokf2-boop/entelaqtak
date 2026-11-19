-- Entelaqtak initial backend schema
-- One private workspace document per authenticated user.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_workspaces_data_is_object check (jsonb_typeof(data) = 'object')
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null check (tool in ('ideas','script','content_pack','titles','seo','repurpose')),
  input_chars integer not null default 0 check (input_chars between 0 and 12000),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx
  on public.ai_usage(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_workspaces enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Workspace is readable by owner" on public.user_workspaces;
create policy "Workspace is readable by owner"
  on public.user_workspaces for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Workspace can be created by owner" on public.user_workspaces;
create policy "Workspace can be created by owner"
  on public.user_workspaces for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Workspace can be updated by owner" on public.user_workspaces;
create policy "Workspace can be updated by owner"
  on public.user_workspaces for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Workspace can be deleted by owner" on public.user_workspaces;
create policy "Workspace can be deleted by owner"
  on public.user_workspaces for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "AI usage is readable by owner" on public.ai_usage;
create policy "AI usage is readable by owner"
  on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "AI usage can be inserted by owner" on public.ai_usage;
create policy "AI usage can be inserted by owner"
  on public.ai_usage for insert to authenticated
  with check (user_id = (select auth.uid()));

create or replace function public.handle_new_entelaqtak_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;

  insert into public.user_workspaces (user_id, data)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_entelaqtak on auth.users;
create trigger on_auth_user_created_entelaqtak
  after insert on auth.users
  for each row execute procedure public.handle_new_entelaqtak_user();

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_workspaces to authenticated;
grant select, insert on public.ai_usage to authenticated;
