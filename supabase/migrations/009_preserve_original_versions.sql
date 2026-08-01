-- Append-only archive ledger for every full-resolution original revision.
-- Participant replacement may change the current submission pointer, but it
-- can never delete an original object or its metadata. Only service-role/SQL
-- runbook cleanup may approve and remove exported objects.

create table public.original_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete set null,
  challenge_id smallint not null references public.challenges(id),
  user_id uuid not null,
  owner_name_at_upload text not null,
  original_path text not null unique,
  game_path text not null unique,
  game_bytes bigint not null check (game_bytes > 0),
  original_filename text not null,
  original_mime text not null,
  original_bytes bigint not null check (original_bytes > 0),
  original_width integer,
  original_height integer,
  original_status text not null check (original_status in ('exact', 'optimized', 'resized', 'legacy')),
  original_source_bytes bigint check (original_source_bytes is null or original_source_bytes > 0),
  original_source_mime text,
  state text not null default 'pending' check (state in ('pending', 'ready')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  cleanup_approved_at timestamptz,
  deleted_at timestamptz,
  game_deleted_at timestamptz,
  constraint original_versions_path_format check (
    original_path like challenge_id::text || '/' || user_id::text || '/%'
    and (
      game_path = user_id::text || '/' || challenge_id::text || '.jpg'
      or game_path like user_id::text || '/' || challenge_id::text || '/%.jpg'
    )
  )
);

create index original_versions_challenge_created_idx
  on public.original_versions (challenge_id, created_at, id);

create index original_versions_user_idx
  on public.original_versions (user_id);

alter table public.original_versions enable row level security;

create policy "Members can view archived original versions"
  on public.original_versions for select to authenticated
  using (public.is_member());

-- Adopt every currently referenced original in place. No objects are copied.
insert into public.original_versions (
  submission_id,
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
  original_source_mime,
  state,
  created_at,
  activated_at
)
select
  submissions.id,
  submissions.challenge_id,
  submissions.user_id,
  profiles.display_name,
  submissions.original_path,
  submissions.storage_path,
  coalesce((game_object.metadata ->> 'size')::bigint, 1),
  coalesce(submissions.original_filename, 'original'),
  coalesce(submissions.original_mime, 'image/jpeg'),
  coalesce(submissions.original_bytes, 1),
  submissions.original_width,
  submissions.original_height,
  coalesce(submissions.original_status, 'exact'),
  submissions.original_source_bytes,
  submissions.original_source_mime,
  'ready',
  submissions.created_at,
  submissions.created_at
from public.submissions
join public.profiles on profiles.user_id = submissions.user_id
left join storage.objects game_object
  on game_object.bucket_id = 'photos' and game_object.name = submissions.storage_path
where submissions.original_path is not null
on conflict (original_path) do nothing;

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

  if exists (
    select 1
    from public.submissions
    join public.votes on votes.submission_id = submissions.id
    where submissions.challenge_id = selected_challenge_id
      and submissions.user_id = current_user_id
  ) then
    raise exception 'This photo already has votes and cannot be replaced';
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

create or replace function public.may_upload_reserved_original(target_path text)
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
        and user_id = auth.uid()
        and state = 'pending'
        and cleanup_approved_at is null
        and deleted_at is null
    );
$$;

revoke all on function public.may_upload_reserved_original(text) from public, anon;
grant execute on function public.may_upload_reserved_original(text) to authenticated;

drop policy if exists "Members upload originals to their folder" on storage.objects;
drop policy if exists "Members remove their replaceable originals" on storage.objects;

create policy "Members upload reserved originals"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photo-originals'
    and public.may_upload_reserved_original(name)
  );

revoke all on function public.may_remove_original(text) from authenticated;

create or replace function public.may_upload_reserved_game_photo(target_path text)
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
      where game_path = target_path
        and user_id = auth.uid()
        and state = 'pending'
        and cleanup_approved_at is null
        and deleted_at is null
    );
$$;

revoke all on function public.may_upload_reserved_game_photo(text) from public, anon;
grant execute on function public.may_upload_reserved_game_photo(text) to authenticated;

drop policy if exists "Members upload to their folder" on storage.objects;
drop policy if exists "Members replace their photos" on storage.objects;
drop policy if exists "Members delete their photos" on storage.objects;

create policy "Members upload reserved game photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.may_upload_reserved_game_photo(name)
  );

alter table public.submissions
  drop constraint if exists submissions_storage_path_check;

alter table public.submissions
  add constraint submissions_storage_path_versioned_check check (
    storage_path = user_id::text || '/' || challenge_id::text || '.jpg'
    or storage_path like user_id::text || '/' || challenge_id::text || '/%.jpg'
  );

drop policy if exists "Members create their submissions" on public.submissions;
drop policy if exists "Members update their submissions" on public.submissions;
drop policy if exists "Members delete their submissions" on public.submissions;

create or replace function public.prevent_submission_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  mutation_context text := current_setting('app.original_version_mutation', true);
  allowed_version_change boolean := false;
begin
  if row(new.id, new.challenge_id, new.user_id, new.created_at)
     is distinct from row(old.id, old.challenge_id, old.user_id, old.created_at) then
    raise exception 'Submission identity fields cannot be changed';
  end if;

  if mutation_context = 'cleanup' then
    allowed_version_change := new.storage_path = old.storage_path;
  elsif mutation_context is not null then
    select exists (
      select 1
      from public.original_versions
      where id::text = mutation_context
        and game_path = new.storage_path
        and original_path = new.original_path
    ) into allowed_version_change;
  end if;

  if row(new.storage_path, new.original_path, new.original_filename, new.original_mime,
         new.original_bytes, new.original_width, new.original_height,
         new.original_status, new.original_source_bytes, new.original_source_mime)
     is distinct from
     row(old.storage_path, old.original_path, old.original_filename, old.original_mime,
         old.original_bytes, old.original_width, old.original_height,
         old.original_status, old.original_source_bytes, old.original_source_mime)
     and not allowed_version_change then
    raise exception 'Photo archive pointers may only change through the activation or host cleanup flow';
  end if;

  return new;
end;
$$;

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

  -- A first submission has no row to lock. Serialize every activation for one
  -- guest/challenge before checking or creating that row, then use FOR UPDATE
  -- to conflict with the foreign-key lock acquired by ballot insertion.
  perform pg_advisory_xact_lock(hashtext(current_user_id::text), archived.challenge_id::integer);

  select id into existing_submission_id
  from public.submissions
  where challenge_id = archived.challenge_id
    and user_id = current_user_id
  for update;

  if exists (
    select 1
    from public.submissions
    join public.votes on votes.submission_id = submissions.id
    where submissions.challenge_id = archived.challenge_id
      and submissions.user_id = current_user_id
  ) then
    raise exception 'This photo already has votes and cannot be replaced';
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

create or replace function public.attach_legacy_original(
  selected_version_id uuid,
  selected_submission_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  archived public.original_versions%rowtype;
  target_submission public.submissions%rowtype;
begin
  select * into archived
  from public.original_versions
  where id = selected_version_id
    and state = 'ready'
    and original_status = 'legacy'
    and deleted_at is null
  for update;

  select * into target_submission
  from public.submissions
  where id = selected_submission_id
  for update;

  if archived.id is null or target_submission.id is null
     or archived.user_id <> target_submission.user_id
     or archived.challenge_id <> target_submission.challenge_id
     or archived.game_path <> target_submission.storage_path then
    raise exception 'Legacy archive does not match the submission';
  end if;

  perform set_config('app.original_version_mutation', selected_version_id::text, true);

  update public.submissions
  set original_path = archived.original_path,
      original_filename = archived.original_filename,
      original_mime = archived.original_mime,
      original_bytes = archived.original_bytes,
      original_width = archived.original_width,
      original_height = archived.original_height,
      original_status = archived.original_status,
      original_source_bytes = archived.original_source_bytes,
      original_source_mime = archived.original_source_mime
  where id = selected_submission_id
    and original_path is null;

  if not found then
    raise exception 'Submission already has an original';
  end if;
end;
$$;

revoke all on function public.attach_legacy_original(uuid, uuid) from public, anon, authenticated;
grant execute on function public.attach_legacy_original(uuid, uuid) to service_role;

create or replace function public.list_original_versions()
returns table (
  version_id uuid,
  submission_id uuid,
  challenge_id smallint,
  challenge_slug text,
  challenge_title text,
  challenge_sort_order smallint,
  user_id uuid,
  owner_name text,
  original_path text,
  original_filename text,
  original_mime text,
  original_bytes bigint,
  original_width integer,
  original_height integer,
  original_status text,
  original_source_bytes bigint,
  original_source_mime text,
  version_state text,
  is_current boolean,
  created_at timestamptz
)
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
    versions.id,
    versions.submission_id,
    versions.challenge_id,
    challenges.slug,
    challenges.title,
    challenges.sort_order,
    versions.user_id,
    versions.owner_name_at_upload,
    versions.original_path,
    versions.original_filename,
    versions.original_mime,
    versions.original_bytes,
    versions.original_width,
    versions.original_height,
    versions.original_status,
    versions.original_source_bytes,
    versions.original_source_mime,
    versions.state,
    coalesce(submissions.original_path = versions.original_path, false),
    versions.created_at
  from public.original_versions versions
  join public.challenges on challenges.id = versions.challenge_id
  join storage.objects on objects.bucket_id = 'photo-originals' and objects.name = versions.original_path
  left join public.submissions on submissions.id = versions.submission_id
  where versions.deleted_at is null
  order by challenges.sort_order, versions.owner_name_at_upload, versions.created_at, versions.id;
end;
$$;

revoke all on function public.list_original_versions() from public, anon;
grant execute on function public.list_original_versions() to authenticated;

-- Bind each ballot choice to the immutable game path the voter actually saw.
-- Row locks serialize voting against activation: a stale path is rejected, and
-- a completed vote prevents later replacement through the activation check.
drop function if exists public.submit_votes(smallint, uuid[]);

create function public.submit_votes(
  selected_challenge_id smallint,
  selected_submission_ids uuid[],
  selected_storage_paths text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  available_count integer;
  selected_count integer := cardinality(selected_submission_ids);
  vote_limit integer;
  valid_count integer;
begin
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if not public.is_member() then
    raise exception 'You are not an active member of this party.';
  end if;

  select count(*) into available_count
  from public.submissions
  where challenge_id = selected_challenge_id;

  vote_limit := least(3, available_count);

  if vote_limit = 0 then
    raise exception 'This challenge has no photos';
  end if;

  if selected_count < 1 or selected_count > vote_limit
     or cardinality(selected_storage_paths) <> selected_count then
    raise exception 'Choose between 1 and % different photo(s)', vote_limit;
  end if;

  if (select count(distinct item) from unnest(selected_submission_ids) item) <> selected_count then
    raise exception 'Every vote must select a different photo';
  end if;

  perform 1
  from public.submissions
  join unnest(selected_submission_ids, selected_storage_paths) selected(id, storage_path)
    on selected.id = submissions.id
    and selected.storage_path = submissions.storage_path
  where submissions.challenge_id = selected_challenge_id
  for share of submissions;

  select count(*) into valid_count
  from public.submissions
  join unnest(selected_submission_ids, selected_storage_paths) selected(id, storage_path)
    on selected.id = submissions.id
    and selected.storage_path = submissions.storage_path
  where submissions.challenge_id = selected_challenge_id;

  if valid_count <> selected_count then
    raise exception 'A selected photo changed; review and submit your ballot again';
  end if;

  delete from public.votes
  where voter_id = current_user_id and challenge_id = selected_challenge_id;

  insert into public.votes (voter_id, challenge_id, submission_id)
  select current_user_id, selected_challenge_id, item
  from unnest(selected_submission_ids) item;
end;
$$;

revoke all on function public.submit_votes(smallint, uuid[], text[]) from public, anon;
grant execute on function public.submit_votes(smallint, uuid[], text[]) to authenticated;
