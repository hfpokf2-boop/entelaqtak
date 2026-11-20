alter table public.ai_usage drop constraint if exists ai_usage_tool_check;
alter table public.ai_usage add constraint ai_usage_tool_check
check (tool in ('ideas','script','content_pack','titles','seo','repurpose','assistant','research','fact_check'));
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.ai_rate_limits (
 identity_hash text primary key check (identity_hash ~ '^[0-9a-f]{64}$'),
 window_started_at timestamptz not null default now(),
 request_count integer not null default 0 check (request_count between 0 and 6),
 updated_at timestamptz not null default now()
);
revoke all on private.ai_rate_limits from public, anon, authenticated;
create or replace function public.consume_ai_rate_limit(p_identity_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_started timestamptz; v_now timestamptz := now();
 v_limit constant integer := 5; v_window constant interval := interval '15 minutes';
begin
 if p_identity_hash is null or p_identity_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid rate-limit identity'; end if;
 insert into private.ai_rate_limits(identity_hash,window_started_at,request_count,updated_at)
 values(p_identity_hash,v_now,1,v_now)
 on conflict(identity_hash) do update
 set request_count=case when private.ai_rate_limits.window_started_at <= v_now-v_window then 1 else least(private.ai_rate_limits.request_count+1,v_limit+1) end,
 window_started_at=case when private.ai_rate_limits.window_started_at <= v_now-v_window then v_now else private.ai_rate_limits.window_started_at end,
 updated_at=v_now
 returning request_count,window_started_at into v_count,v_started;
 return jsonb_build_object('allowed',v_count<=v_limit,'limit',v_limit,'remaining',greatest(0,v_limit-v_count),
 'retry_after',case when v_count<=v_limit then 0 else greatest(1,ceil(extract(epoch from(v_started+v_window-v_now)))::integer) end);
end; $$;
revoke all on function public.consume_ai_rate_limit(text) from public,anon,authenticated;
grant execute on function public.consume_ai_rate_limit(text) to service_role;
create index if not exists ai_rate_limits_updated_at_idx on private.ai_rate_limits(updated_at);
