-- Passphrase-gated party membership.
--
-- Before this migration, any visitor who obtained an anonymous session could
-- create a profile and satisfy every table and Storage policy. After this
-- migration, every party read and write additionally requires an active
-- membership, which is only granted by public.join_party() after a
-- server-side bcrypt passphrase check.
--
-- After applying this migration the party is LOCKED: joining is impossible
-- until the host sets a passphrase from the Supabase SQL editor with
--   select set_party_passphrase('your-long-passphrase');
-- See /developer/security-ops/ for the full host runbook.

-- ---------------------------------------------------------------------------
-- Party settings: a single row holding the bcrypt passphrase hash and the
-- open/closed switch. Clients have no access; only privileged functions and
-- the Supabase dashboard touch this table.
-- ---------------------------------------------------------------------------

create table public.party_settings (
  id boolean primary key default true check (id),
  passphrase_hash text,
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.party_settings (id) values (true)
on conflict (id) do nothing;

alter table public.party_settings enable row level security;
revoke all on table public.party_settings from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Memberships: one row per admitted anonymous identity. Rows are only created
-- by public.join_party(); clients cannot insert, update, or delete them.
-- ---------------------------------------------------------------------------

create table public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.memberships enable row level security;
revoke all on table public.memberships from public, anon, authenticated;
grant select on table public.memberships to authenticated;

create policy "Members can read their membership"
  on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Membership predicate used by every party policy. Active membership requires
-- both a membership row and an open party, so flipping is_open to false
-- revokes access for everyone at once.
-- ---------------------------------------------------------------------------

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
      select 1 from public.memberships
      where user_id = auth.uid()
    )
    and coalesce((select party_settings.is_open from public.party_settings), false);
$$;

revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- ---------------------------------------------------------------------------
-- Joining: validates the passphrase against the stored bcrypt hash entirely
-- inside the database. An incorrect passphrase never creates a membership.
-- pgcrypto may live in the extensions schema on Supabase, so it is included
-- in the search path (missing schemas in a search path are ignored).
-- ---------------------------------------------------------------------------

create or replace function public.join_party(party_passphrase text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  stored_hash text;
  party_open boolean;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select passphrase_hash, is_open into stored_hash, party_open
  from public.party_settings;

  if party_open is distinct from true then
    raise exception 'The party is closed.';
  end if;

  if stored_hash is null then
    raise exception 'The party is not open yet. Ask the host.';
  end if;

  if crypt(party_passphrase, stored_hash) <> stored_hash then
    raise exception 'That passphrase is not correct.';
  end if;

  insert into public.memberships (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.join_party(text) from public, anon;
grant execute on function public.join_party(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Party status for the frontend: safe to expose because it reveals only
-- whether the party is open and whether the caller is an active member.
-- ---------------------------------------------------------------------------

create or replace function public.get_party_status()
returns table (is_open boolean, is_member boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select party_settings.is_open from public.party_settings), false),
    public.is_member();
$$;

revoke all on function public.get_party_status() from public, anon;
grant execute on function public.get_party_status() to authenticated;

-- ---------------------------------------------------------------------------
-- Host runbook helper: stores only the bcrypt hash of the passphrase. Execute
-- rights are revoked from every client-facing role, so it can only be called
-- from the Supabase dashboard SQL editor (postgres role):
--   select set_party_passphrase('maple-otter-battery-42');
-- ---------------------------------------------------------------------------

create or replace function public.set_party_passphrase(new_passphrase text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new_passphrase is null or length(trim(new_passphrase)) < 12 then
    raise exception 'Choose a passphrase of at least 12 characters.';
  end if;

  update public.party_settings
  set passphrase_hash = crypt(new_passphrase, gen_salt('bf', 10)),
      updated_at = now();
end;
$$;

revoke all on function public.set_party_passphrase(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Table policies: recreate every party policy with the membership predicate.
-- ---------------------------------------------------------------------------

drop policy "Participants can read profiles" on public.profiles;
drop policy "Participants create their profile" on public.profiles;
drop policy "Participants update their profile" on public.profiles;

create policy "Members can read profiles"
  on public.profiles for select to authenticated
  using (public.is_member());
create policy "Members create their profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id and public.is_member());
create policy "Members update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id and public.is_member())
  with check ((select auth.uid()) = user_id and public.is_member());

drop policy "Participants can read challenges" on public.challenges;

create policy "Members can read challenges"
  on public.challenges for select to authenticated
  using (public.is_member());

drop policy "Participants can read submissions" on public.submissions;
drop policy "Participants create their submissions" on public.submissions;
drop policy "Participants update their submissions" on public.submissions;
drop policy "Participants delete their submissions" on public.submissions;

create policy "Members can read submissions"
  on public.submissions for select to authenticated
  using (public.is_member());
create policy "Members create their submissions"
  on public.submissions for insert to authenticated
  with check ((select auth.uid()) = user_id and public.is_member());
create policy "Members update their submissions"
  on public.submissions for update to authenticated
  using (public.may_change_submission(id, user_id) and public.is_member())
  with check ((select auth.uid()) = user_id and public.is_member());
create policy "Members delete their submissions"
  on public.submissions for delete to authenticated
  using (public.may_change_submission(id, user_id) and public.is_member());

drop policy "Participants can read their votes" on public.votes;

create policy "Members can read their votes"
  on public.votes for select to authenticated
  using (voter_id = (select auth.uid()) and public.is_member());

-- ---------------------------------------------------------------------------
-- Storage policies: image bytes now require an active membership, not merely
-- a profile row.
-- ---------------------------------------------------------------------------

drop policy "Participants can view party photos" on storage.objects;
drop policy "Participants upload to their folder" on storage.objects;
drop policy "Participants replace their photos" on storage.objects;
drop policy "Participants delete their photos" on storage.objects;

create policy "Members can view party photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_member()
  );
create policy "Members upload to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_member()
  );
create policy "Members replace their photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and owner_id = (select auth.uid())::text
    and public.may_replace_photo(name)
    and public.is_member()
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_member()
  );
create policy "Members delete their photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and owner_id = (select auth.uid())::text
    and public.may_replace_photo(name)
    and public.is_member()
  );

-- ---------------------------------------------------------------------------
-- Voting RPC: require active membership before counting or writing a ballot.
-- ---------------------------------------------------------------------------

create or replace function public.submit_votes(
  selected_challenge_id smallint,
  selected_submission_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  available_count integer;
  required_count integer;
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

  required_count := least(3, available_count);

  if required_count = 0 then
    raise exception 'This challenge has no photos';
  end if;

  if cardinality(selected_submission_ids) <> required_count then
    raise exception 'Choose % different photo(s)', required_count;
  end if;

  if (select count(distinct item) from unnest(selected_submission_ids) item) <> required_count then
    raise exception 'Choose % different photo(s)', required_count;
  end if;

  select count(*) into valid_count
  from public.submissions
  where challenge_id = selected_challenge_id
    and id = any(selected_submission_ids);

  if valid_count <> required_count then
    raise exception 'Every photo must belong to this challenge';
  end if;

  delete from public.votes
  where voter_id = current_user_id and challenge_id = selected_challenge_id;

  insert into public.votes (voter_id, challenge_id, submission_id)
  select current_user_id, selected_challenge_id, item
  from unnest(selected_submission_ids) item;
end;
$$;

revoke all on function public.submit_votes(smallint, uuid[]) from public, anon;
grant execute on function public.submit_votes(smallint, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Results view: challenge_results bypasses row-level security
-- (security_invoker = false) so it can aggregate every guest's votes. Gate it
-- directly with the membership predicate; the leaderboard view reads from it
-- and is covered transitively.
-- ---------------------------------------------------------------------------

create or replace view public.challenge_results
with (security_invoker = false)
as
with totals as (
  select
    submissions.id as submission_id,
    submissions.challenge_id,
    submissions.user_id,
    submissions.storage_path,
    submissions.created_at,
    profiles.display_name,
    count(votes.submission_id)::integer as vote_count
  from public.submissions
  join public.profiles on profiles.user_id = submissions.user_id
  left join public.votes on votes.submission_id = submissions.id
  where public.is_member()
  group by submissions.id, profiles.display_name
), ranked as (
  select *, rank() over (partition by challenge_id order by vote_count desc) as place
  from totals
)
select *,
  case
    when vote_count = 0 then 0
    when place = 1 then 3
    when place = 2 then 2
    when place = 3 then 1
    else 0
  end::integer as points
from ranked;
