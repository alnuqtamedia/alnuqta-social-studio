-- Independent studio project only. All access is through authenticated server handlers.
create table public.studio_oauth_records (
 kind text not null check (kind in ('state','ticket','session','connection','rate')),
 key text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null,
 expires_at timestamptz,
 primary key (kind,key)
);
alter table public.studio_oauth_records enable row level security;
revoke all on public.studio_oauth_records from public, anon, authenticated;
grant all on public.studio_oauth_records to service_role;
create index studio_oauth_records_expiry on public.studio_oauth_records(expires_at) where expires_at is not null;
create index studio_oauth_records_owner on public.studio_oauth_records(user_id,kind);
create function public.studio_oauth_take(p_kind text, p_key text)
returns jsonb language sql security invoker set search_path = '' as $$
 delete from public.studio_oauth_records where kind=p_kind and key=p_key
 returning case when expires_at > now() then payload else null end;
$$;
create function public.studio_oauth_session_active(p_user uuid, p_session uuid)
returns boolean language sql security invoker set search_path = '' as $$
 select exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after > now()));
$$;
create function public.studio_oauth_rate(p_user uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
 declare n integer; k text := p_user::text || ':' || floor(extract(epoch from now())/60)::text;
 begin
 insert into public.studio_oauth_records(kind,key,user_id,payload,expires_at)
 values('rate',k,p_user,'{"count":1}'::jsonb,now()+interval '2 minutes')
 on conflict(kind,key) do update set payload=jsonb_build_object('count',(studio_oauth_records.payload->>'count')::integer+1)
 returning (payload->>'count')::integer into n;
 return n <= 5;
 end;
$$;
revoke all on function public.studio_oauth_take(text,text) from public,anon,authenticated;
revoke all on function public.studio_oauth_session_active(uuid,uuid) from public,anon,authenticated;
revoke all on function public.studio_oauth_rate(uuid) from public,anon,authenticated;
grant execute on function public.studio_oauth_take(text,text), public.studio_oauth_session_active(uuid,uuid), public.studio_oauth_rate(uuid) to service_role;
-- Minimum columns required for revocation-aware server session checks.
grant select(id,user_id,not_after) on auth.sessions to service_role;
