-- Voted submissions may be replaced after an explicit client warning. The
-- activation transaction clears every vote attached to the stable submission
-- ID before switching its pointers to the new immutable photo version.

create or replace function public.reserve_original_version(
  selected_challenge_id smallint,
  archive_extension text,
  archive_filename text,
  archive_mime text,
  archive_bytes bigint,
  archive_width integer,
  archive_height integer,
  archive_status text,
  source_bytes bigint,
  source_mime text,
  game_copy_bytes bigint
)
returns table (version_id uuid, original_path text, game_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_owner_name text;
  next_version_id uuid := gen_random_uuid();
  next_path text;
  next_game_path text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if not public.is_member() then
    raise exception 'You are not an active member of this party.';
  end if;

  if archive_extension not in ('jpg', 'jpeg', 'heic', 'heif') then
    raise exception 'Unsupported original extension';
  end if;

  if archive_status not in ('exact', 'optimized', 'resized', 'legacy') then
    raise exception 'Unsupported original status';
  end if;

  if archive_bytes <= 0 or game_copy_bytes <= 0 then
    raise exception 'Photo bytes must be positive';
  end if;

  if not exists (select 1 from public.challenges where id = selected_challenge_id) then
    raise exception 'Challenge not found';
  end if;

  select display_name into current_owner_name
  from public.profiles
  where user_id = current_user_id;

  if current_owner_name is null then
    raise exception 'Profile not found';
  end if;

  next_path := selected_challenge_id::text || '/' || current_user_id::text || '/' || next_version_id::text || '.' || lower(archive_extension);
  next_game_path := current_user_id::text || '/' || selected_challenge_id::text || '/' || next_version_id::text || '.jpg';

  insert into public.original_versions (
    id,
    challenge_id,
    user_id,
    owner_name_at_upload,
    original_path,
    game_path,
    game_bytes,
    original_filename,
    original_mime,
    original_bytes,
    original_width,
    original_height,
    original_status,
    original_source_bytes,
    original_source_mime
  ) values (
    next_version_id,
    selected_challenge_id,
    current_user_id,
    current_owner_name,
    next_path,
    next_game_path,
    game_copy_bytes,
    archive_filename,
    archive_mime,
    archive_bytes,
    archive_width,
    archive_height,
    archive_status,
    source_bytes,
    source_mime
  );

  return query select next_version_id, next_path, next_game_path;
end;
$$;

revoke all on function public.reserve_original_version(smallint, text, text, text, bigint, integer, integer, text, bigint, text, bigint) from public, anon;
grant execute on function public.reserve_original_version(smallint, text, text, text, bigint, integer, integer, text, bigint, text, bigint) to authenticated;

create or replace function public.activate_original_version(
  selected_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  current_user_id uuid := auth.uid();
  archived public.original_versions%rowtype;
  active_submission_id uuid;
  existing_submission_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if not public.is_member() then
    raise exception 'You are not an active member of this party.';
  end if;

  select * into archived
  from public.original_versions
  where id = selected_version_id
    and user_id = current_user_id
    and state = 'pending'
    and cleanup_approved_at is null
    and deleted_at is null
  for update;

  if archived.id is null then
    raise exception 'Pending original version not found';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'photo-originals'
      and name = archived.original_path
      and coalesce((metadata ->> 'size')::bigint, 0) = archived.original_bytes
  ) then
    raise exception 'Reserved original object is missing or has the wrong size';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'photos'
      and name = archived.game_path
      and coalesce((metadata ->> 'size')::bigint, 0) = archived.game_bytes
      and updated_at >= archived.created_at
  ) then
    raise exception 'A new game photo object is missing';
  end if;

  -- The row lock serializes activation against ballot insertion. Votes that
  -- committed before this lock are cleared; a stale ballot that follows this
  -- transaction is rejected because its submitted game path no longer matches.
  perform pg_advisory_xact_lock(hashtext(current_user_id::text), archived.challenge_id::integer);

  select id into existing_submission_id
  from public.submissions
  where challenge_id = archived.challenge_id
    and user_id = current_user_id
  for update;

  if existing_submission_id is not null then
    delete from public.votes
    where submission_id = existing_submission_id;
  end if;

  perform set_config('app.original_version_mutation', selected_version_id::text, true);

  insert into public.submissions (
    challenge_id,
    user_id,
    storage_path,
    original_path,
    original_filename,
    original_mime,
    original_bytes,
    original_width,
    original_height,
    original_status,
    original_source_bytes,
    original_source_mime
  ) values (
    archived.challenge_id,
    current_user_id,
    archived.game_path,
    archived.original_path,
    archived.original_filename,
    archived.original_mime,
    archived.original_bytes,
    archived.original_width,
    archived.original_height,
    archived.original_status,
    archived.original_source_bytes,
    archived.original_source_mime
  )
  on conflict (challenge_id, user_id) do update set
    storage_path = excluded.storage_path,
    original_path = excluded.original_path,
    original_filename = excluded.original_filename,
    original_mime = excluded.original_mime,
    original_bytes = excluded.original_bytes,
    original_width = excluded.original_width,
    original_height = excluded.original_height,
    original_status = excluded.original_status,
    original_source_bytes = excluded.original_source_bytes,
    original_source_mime = excluded.original_source_mime
  returning id into active_submission_id;

  update public.original_versions
  set submission_id = active_submission_id,
      state = 'ready',
      activated_at = now()
  where id = selected_version_id;
end;
$$;

revoke all on function public.activate_original_version(uuid) from public, anon;
grant execute on function public.activate_original_version(uuid) to authenticated;
