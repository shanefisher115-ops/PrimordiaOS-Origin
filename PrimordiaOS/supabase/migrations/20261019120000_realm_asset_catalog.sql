-- Realm-asset engineer catalog (PrimordiaOS/realm-asset-engineer).
--
-- A row is a recipe: genre + generator + resolved params + kernel commit + manifold-3d version. The kernel is
-- deterministic, so a row regenerates its mesh; mesh_sha256 checks that it still does. Storage holds small WebP
-- thumbnails for every kept row and a .glb only for approved rows.
--
-- Access: the engineer (server side) uses the service-role key, which bypasses RLS. Browsers get nothing as
-- anon. Signed-in reviewers listed in realm_asset_reviewers may read the catalog, approve or reject, and
-- queue briefs. The bucket is private; files are reached through signed URLs.
--
-- Safe to run more than once.

-- ------------------------------------------------------------------ tables

create table if not exists public.realm_asset_reviewers (
    email text primary key check (email = lower(email)),
    added_at timestamptz not null default now()
);

create table if not exists public.realm_asset_briefs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    genre text not null,
    count integer not null default 4 check (count between 1 and 50),
    generators text[],
    notes text check (char_length(notes) <= 500),
    status text not null default 'queued' check (status in ('queued', 'taken', 'done', 'cancelled')),
    taken_at timestamptz,
    done_at timestamptz,
    created_by text
);

create table if not exists public.realm_assets (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    name text not null unique,                 -- SM_GothicSpire_3fa9c1, the Unreal asset name
    genre text not null,
    generator text not null,
    params jsonb not null,                     -- resolved generator params: the recipe
    seed bigint,
    pack_version text not null,
    kernel_commit text not null,               -- git commit of Primordia-cad that built it
    kernel_dirty boolean not null default false,
    manifold_version text not null,
    mesh_sha256 text not null unique,          -- sha256 of the .glb bytes; regeneration must reproduce it
    metrics jsonb not null,                    -- triangles, size_m, volume_m3, area_m2, genus, closed, materials, glb_bytes
    scores jsonb not null,                     -- variety, vision, taste, total
    silhouette text,                           -- base64 bitmask (3 views), for the variety check
    verdict text not null default 'kept' check (verdict in ('kept', 'approved', 'rejected')),
    review_note text check (char_length(review_note) <= 500),
    reviewed_at timestamptz,
    reviewed_by text,
    lineage jsonb not null default '{}'::jsonb, -- { mode: explore|mutate, brief_id, parent_name, agent_version }
    parent_id uuid references public.realm_assets (id) on delete set null,
    brief_id uuid references public.realm_asset_briefs (id) on delete set null,
    thumb_path text,
    thumb_bytes integer,
    strip_path text,                           -- turntable sprite (8 frames side by side)
    strip_bytes integer,
    glb_path text,
    glb_bytes integer,
    imported_to_unreal boolean not null default false,
    unreal_path text,
    imported_at timestamptz,
    flags text[] not null default '{}'
);

create index if not exists realm_assets_genre_verdict on public.realm_assets (genre, verdict, created_at desc);
create index if not exists realm_assets_to_import on public.realm_assets (verdict, imported_to_unreal) where verdict = 'approved';
create index if not exists realm_assets_reviewed on public.realm_assets (reviewed_at) where reviewed_at is not null;
create index if not exists realm_asset_briefs_queued on public.realm_asset_briefs (created_at) where status = 'queued';

-- updated_at, and reviewed_at/reviewed_by when the verdict changes
create or replace function public.realm_assets_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.updated_at := now();
    if new.verdict is distinct from old.verdict then
        if new.reviewed_at is not distinct from old.reviewed_at then new.reviewed_at := now(); end if;
        if new.reviewed_by is not distinct from old.reviewed_by then
            new.reviewed_by := coalesce((select auth.jwt() ->> 'email'), new.reviewed_by);
        end if;
    end if;
    return new;
end $$;

drop trigger if exists realm_assets_touch on public.realm_assets;
create trigger realm_assets_touch before update on public.realm_assets
    for each row execute function public.realm_assets_touch();

-- ------------------------------------------------------------------ usage (free tier: 1 GB storage, 500 MB database)

create or replace view public.realm_asset_usage with (security_invoker = true) as
select
    count(*)::bigint as assets,
    count(*) filter (where verdict = 'approved')::bigint as approved,
    count(*) filter (where verdict = 'kept')::bigint as awaiting_review,
    count(*) filter (where glb_path is not null)::bigint as with_glb,
    coalesce(sum(coalesce(glb_bytes, 0) + coalesce(thumb_bytes, 0) + coalesce(strip_bytes, 0)), 0)::bigint as storage_bytes
from public.realm_assets;

create or replace function public.realm_asset_db_bytes() returns bigint
language sql stable security definer set search_path = '' as $$
    select pg_database_size(current_database());
$$;

-- ------------------------------------------------------------------ row level security

create or replace function public.is_realm_reviewer() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.realm_asset_reviewers r
        where r.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    );
$$;

alter table public.realm_asset_reviewers enable row level security;
alter table public.realm_asset_briefs enable row level security;
alter table public.realm_assets enable row level security;

revoke all on public.realm_asset_reviewers, public.realm_asset_briefs, public.realm_assets, public.realm_asset_usage from anon, authenticated;
revoke all on function public.is_realm_reviewer(), public.realm_asset_db_bytes() from public, anon, authenticated;
grant execute on function public.is_realm_reviewer() to authenticated;
grant execute on function public.realm_asset_db_bytes() to service_role;

-- Reviewers read the catalog and may change only the review columns.
grant select on public.realm_assets, public.realm_asset_usage to authenticated;
grant update (verdict, review_note) on public.realm_assets to authenticated;
drop policy if exists "reviewers read assets" on public.realm_assets;
create policy "reviewers read assets" on public.realm_assets
    for select to authenticated using ((select public.is_realm_reviewer()));
drop policy if exists "reviewers review assets" on public.realm_assets;
create policy "reviewers review assets" on public.realm_assets
    for update to authenticated using ((select public.is_realm_reviewer())) with check ((select public.is_realm_reviewer()));

-- Reviewers read and queue briefs.
grant select, insert on public.realm_asset_briefs to authenticated;
drop policy if exists "reviewers read briefs" on public.realm_asset_briefs;
create policy "reviewers read briefs" on public.realm_asset_briefs
    for select to authenticated using ((select public.is_realm_reviewer()));
drop policy if exists "reviewers queue briefs" on public.realm_asset_briefs;
create policy "reviewers queue briefs" on public.realm_asset_briefs
    for insert to authenticated with check ((select public.is_realm_reviewer()) and status = 'queued');

-- realm_asset_reviewers: no policies, so only the service role (and the SQL editor) can read or change it.

-- ------------------------------------------------------------------ storage: private bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('realm-assets', 'realm-assets', false, 52428800, array['model/gltf-binary', 'image/webp', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Reviewers may read (and so sign URLs for) files in the bucket. Writes are service-role only.
drop policy if exists "reviewers read realm-assets" on storage.objects;
create policy "reviewers read realm-assets" on storage.objects
    for select to authenticated using (bucket_id = 'realm-assets' and (select public.is_realm_reviewer()));
