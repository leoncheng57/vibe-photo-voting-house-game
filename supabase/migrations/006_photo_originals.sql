-- Full-resolution original photo archive.
--
-- The game keeps two copies of every submission:
--   photos           {user_id}/{challenge_id}.jpg        game/TV JPEG (<= 5 MiB)
--   photo-originals  {challenge_id}/{user_id}/{v}.{ext}  untouched HEIC/JPEG capture
--
-- Originals at or below ~6 MiB are preserved byte-for-byte by the client;
-- larger captures are optimized client-side below that target and flagged
-- with original_reduced = true. The bucket keeps a 25 MiB hard ceiling as a
-- defense-in-depth limit only.
--
-- Members export originals per challenge as a local ZIP from
-- /developer/host-runbook/. After verifying and backing up a ZIP, the host
-- clears that challenge's database references and deletes the challenge
-- folder from the bucket (see the runbook page and README).
--
-- Original object paths are versioned ({v} = upload timestamp) so replacing
-- a photo never overwrites the previous original before the database row is
-- updated. Superseded objects are removed by the uploader afterwards.

-- ---------------------------------------------------------------------------
-- Submission columns describing the archived original. Nullable so existing
-- rows stay valid; original_path format is enforced when present.
-- ---------------------------------------------------------------------------

alter table public.submissions
  add column original_path text unique,
  add column original_filename text,
  add column original_mime text,
  add column original_bytes bigint,
  add column original_width integer,
  add column original_height integer,
  add column original_reduced boolean;

alter table public.submissions
  add constraint submissions_original_path_format check (
    original_path is null
    or original_path like challenge_id::text || '/' || user_id::text || '/%'
  ),
  add constraint submissions_original_bytes_positive check (
    original_bytes is null or original_bytes > 0
  );

-- ---------------------------------------------------------------------------
-- Private bucket for originals. 25 MiB per object, HEIC/HEIF/JPEG only.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photo-originals', 'photo-originals', false, 26214400, array['image/jpeg', 'image/heic', 'image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- An original object may be removed by its uploader when it is superseded
-- (no submission references it) or while its submission can still change
-- (no votes yet). Voted submissions keep their original until host cleanup.
-- ---------------------------------------------------------------------------

create or replace function public.may_remove_original(target_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
      select 1 from public.submissions where original_path = target_path
    )
    or exists (
      select 1
      from public.submissions
      where original_path = target_path
        and user_id = auth.uid()
        and not exists (
          select 1 from public.votes where submission_id = submissions.id
        )
    );
$$;

revoke all on function public.may_remove_original(text) from public, anon;
grant execute on function public.may_remove_original(text) to authenticated;

create policy "Members can view original photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photo-originals'
    and public.is_member()
  );

create policy "Members upload originals to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photo-originals'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.is_member()
  );

create policy "Members remove their replaceable originals"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photo-originals'
    and owner_id = (select auth.uid())::text
    and public.may_remove_original(name)
    and public.is_member()
  );

-- ---------------------------------------------------------------------------
-- Aggregate storage usage for the in-app meter. Members receive byte totals
-- and object counts per bucket, never object names.
-- ---------------------------------------------------------------------------

create or replace function public.get_storage_usage()
returns table (bucket_id text, total_bytes bigint, object_count integer)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
begin
  if not public.is_member() then
    raise exception 'You are not an active member of this party.';
  end if;

  return query
  select
    buckets.id::text,
    coalesce(sum((objects.metadata ->> 'size')::bigint), 0)::bigint,
    count(objects.id)::integer
  from storage.buckets buckets
  left join storage.objects objects on objects.bucket_id = buckets.id
  where buckets.id in ('photos', 'photo-originals')
  group by buckets.id;
end;
$$;

revoke all on function public.get_storage_usage() from public, anon;
grant execute on function public.get_storage_usage() to authenticated;
