-- Host approval remains an exact-ID SQL operation. After approval, active
-- members may use the runbook UI to remove only those approved Storage objects
-- and record only objects that Storage confirms are absent.

create or replace function public.may_remove_approved_original(target_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_member()
    and exists (
      select 1
      from public.original_versions
      where original_path = target_path
        and cleanup_approved_at is not null
        and deleted_at is null
    );
$$;

revoke all on function public.may_remove_approved_original(text) from public, anon;
grant execute on function public.may_remove_approved_original(text) to authenticated;

create policy "Members remove cleanup-approved originals"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photo-originals'
    and public.may_remove_approved_original(name)
  );

create or replace function public.get_original_cleanup_status(selected_version_ids uuid[])
returns table (
  version_id uuid,
  original_path text,
  approved boolean,
  object_exists boolean,
  deletion_recorded boolean
)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  selected_count integer := cardinality(selected_version_ids);
  found_count integer;
begin
  if not public.is_member() then
    raise exception 'You are not an active member of this party.';
  end if;

  if selected_count is null or selected_count = 0 then
    raise exception 'Cleanup requires at least one exported version.';
  end if;

  if (select count(distinct item) from unnest(selected_version_ids) item) <> selected_count then
    raise exception 'Cleanup version IDs must be unique.';
  end if;

  select count(*) into found_count
  from public.original_versions
  where id = any (selected_version_ids);

  if found_count <> selected_count then
    raise exception 'One or more exported versions no longer exist.';
  end if;

  return query
  select
    versions.id,
    versions.original_path,
    versions.cleanup_approved_at is not null,
    exists (
      select 1 from storage.objects objects
      where objects.bucket_id = 'photo-originals'
        and objects.name = versions.original_path
    ),
    versions.deleted_at is not null
  from public.original_versions versions
  where versions.id = any (selected_version_ids)
  order by versions.created_at, versions.id;
end;
$$;

revoke all on function public.get_original_cleanup_status(uuid[]) from public, anon;
grant execute on function public.get_original_cleanup_status(uuid[]) to authenticated;

create or replace function public.confirm_original_cleanup(selected_version_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  selected_count integer := cardinality(selected_version_ids);
  approved_count integer;
begin
  if not public.is_member() then
    raise exception 'You are not an active member of this party.';
  end if;

  if selected_count is null or selected_count = 0 then
    raise exception 'Cleanup requires at least one exported version.';
  end if;

  if (select count(distinct item) from unnest(selected_version_ids) item) <> selected_count then
    raise exception 'Cleanup version IDs must be unique.';
  end if;

  select count(*) into approved_count
  from public.original_versions
  where id = any (selected_version_ids)
    and cleanup_approved_at is not null;

  if approved_count <> selected_count then
    raise exception 'Every exported version must be approved before cleanup.';
  end if;

  update public.original_versions versions
  set deleted_at = now()
  where versions.id = any (selected_version_ids)
    and versions.deleted_at is null
    and not exists (
      select 1 from storage.objects objects
      where objects.bucket_id = 'photo-originals'
        and objects.name = versions.original_path
    );
end;
$$;

revoke all on function public.confirm_original_cleanup(uuid[]) from public, anon;
grant execute on function public.confirm_original_cleanup(uuid[]) to authenticated;
