alter table public.visitor_sessions
  add column if not exists session_token text;

alter table public.visitor_sessions
  drop constraint if exists visitor_sessions_session_token_length;
alter table public.visitor_sessions
  add constraint visitor_sessions_session_token_length
  check (session_token is null or length(session_token) between 32 and 128);

drop policy if exists "Visitors can start own anonymous session" on public.visitor_sessions;
drop policy if exists "Visitors can update own session heartbeat" on public.visitor_sessions;

revoke all on public.visitor_sessions from anon, authenticated;
grant select on public.visitor_sessions to authenticated;

create or replace function public.heartbeat_visitor_session(
  p_session_id uuid,
  p_session_token text,
  p_user_id uuid,
  p_visitor_email text,
  p_page_path text,
  p_user_agent text,
  p_referrer text,
  p_ended boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt jsonb := auth.jwt();
  v_now timestamptz := now();
begin
  if p_session_id is null
     or p_session_token is null
     or length(p_session_token) < 32
     or length(p_session_token) > 128 then
    raise exception 'Invalid visitor session credentials';
  end if;

  if v_uid is null then
    if p_user_id is not null or p_visitor_email is not null then
      raise exception 'Anonymous session cannot claim an account';
    end if;
  else
    if p_user_id is distinct from v_uid
       or lower(coalesce(p_visitor_email, '')) <> lower(coalesce(v_jwt ->> 'email', '')) then
      raise exception 'Visitor account does not match authenticated user';
    end if;
  end if;

  insert into public.visitor_sessions (
    session_id, session_token, user_id, visitor_email, page_path,
    first_seen, last_seen, ended_at, user_agent, referrer
  )
  values (
    p_session_id, p_session_token, p_user_id, p_visitor_email,
    left(coalesce(p_page_path, '/'), 500), v_now, v_now,
    case when coalesce(p_ended, false) then v_now else null end,
    left(coalesce(p_user_agent, ''), 500),
    left(coalesce(p_referrer, ''), 1000)
  )
  on conflict (session_id) do update
  set user_id = coalesce(public.visitor_sessions.user_id, excluded.user_id),
      visitor_email = coalesce(public.visitor_sessions.visitor_email, excluded.visitor_email),
      page_path = excluded.page_path,
      last_seen = excluded.last_seen,
      ended_at = excluded.ended_at,
      user_agent = excluded.user_agent,
      referrer = excluded.referrer
  where public.visitor_sessions.session_token = excluded.session_token
    and (
      public.visitor_sessions.user_id is null
      or public.visitor_sessions.user_id = excluded.user_id
    );

  if not found then
    raise exception 'Invalid visitor session credentials';
  end if;
end;
$$;

revoke all on function public.heartbeat_visitor_session(uuid,text,uuid,text,text,text,text,boolean) from public;
grant execute on function public.heartbeat_visitor_session(uuid,text,uuid,text,text,text,text,boolean) to anon, authenticated;

create index if not exists visitor_sessions_user_id_idx on public.visitor_sessions(user_id);
notify pgrst, 'reload schema';
