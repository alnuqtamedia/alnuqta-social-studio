create table public.studio_youtube_uploads (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 channel_id text not null,
 request_id uuid not null,
 status text not null default 'initializing',
 total_bytes bigint not null check(total_bytes>0 and total_bytes<=262144000),
 uploaded_bytes bigint not null default 0 check(uploaded_bytes>=0),
 metadata jsonb not null,
 upload_secret jsonb,
 video_id text,
 actual_privacy text,
 lease_id uuid,
 lease_until timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,request_id)
);
alter table public.studio_youtube_uploads enable row level security;
revoke all on public.studio_youtube_uploads from public,anon,authenticated;
grant all on public.studio_youtube_uploads to service_role;
create index studio_youtube_uploads_owner on public.studio_youtube_uploads(user_id,created_at desc);
create function public.studio_youtube_lease(p_user uuid,p_id uuid,p_lease uuid)
returns setof public.studio_youtube_uploads language sql security invoker set search_path='' as $$
 update public.studio_youtube_uploads set lease_id=p_lease,lease_until=now()+interval '120 seconds',updated_at=now()
 where user_id=p_user and id=p_id and (lease_until is null or lease_until<now())
 returning *;
$$;
revoke all on function public.studio_youtube_lease(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.studio_youtube_lease(uuid,uuid,uuid) to service_role;
