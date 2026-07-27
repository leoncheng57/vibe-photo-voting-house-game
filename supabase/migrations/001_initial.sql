create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 24),
  created_at timestamptz not null default now()
);

create unique index profiles_display_name_unique on public.profiles (lower(trim(display_name)));

create table public.challenges (
  id smallint primary key,
  slug text not null unique,
  title text not null,
  prompt text not null,
  kicker text not null,
  sort_order smallint not null unique
);

insert into public.challenges (id, slug, title, prompt, kicker, sort_order) values
  (1, 'dog-date', 'The Dog Date', 'Take the photo that makes you and the dog look like lifelong best friends.', 'Good human. Better co-star.', 1),
  (2, 'balcony', 'Balcony Postcard', 'Frame the city from the balcony like it belongs on a postcard.', 'Skyline, but make it cinematic.', 2),
  (3, 'mirror', 'Mirror Main Character', 'Create the most unforgettable mirror selfie in the house.', 'Find your angle.', 3),
  (4, 'twins', 'Accidental Twins', 'Find the guests with the best matching or coordinated outfits.', 'Same wavelength, same wardrobe.', 4),
  (5, 'food', 'Food Magazine Cover', 'Make one party snack or dish look worthy of a glossy cover.', 'The camera eats first.', 5),
  (7, 'candid', 'Peak Drama', 'Capture the funniest or most dramatic candid moment of the party.', 'No context required.', 6);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id smallint not null references public.challenges(id),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  check (storage_path = user_id::text || '/' || challenge_id::text || '.jpg'),
  unique (challenge_id, user_id),
  unique (id, challenge_id)
);

create table public.votes (
  voter_id uuid not null references public.profiles(user_id) on delete cascade,
  challenge_id smallint not null references public.challenges(id),
  submission_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (voter_id, challenge_id, submission_id),
  foreign key (submission_id, challenge_id)
    references public.submissions(id, challenge_id) on delete cascade
);

create or replace function public.may_change_submission(target_submission_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    and not exists (
      select 1 from public.votes where submission_id = target_submission_id
    );
$$;

create or replace function public.may_replace_photo(target_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.submissions
    where storage_path = target_path
      and user_id = auth.uid()
      and not exists (
        select 1 from public.votes where submission_id = submissions.id
      )
  );
$$;

create or replace function public.prevent_submission_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(new.id, new.challenge_id, new.user_id, new.storage_path, new.created_at)
     is distinct from row(old.id, old.challenge_id, old.user_id, old.storage_path, old.created_at) then
    raise exception 'Submission identity fields cannot be changed';
  end if;
  return new;
end;
$$;

create trigger submissions_keep_identity
before update on public.submissions
for each row execute function public.prevent_submission_identity_change();

revoke all on function public.may_change_submission(uuid, uuid) from public, anon;
revoke all on function public.may_replace_photo(text) from public, anon;
grant execute on function public.may_change_submission(uuid, uuid) to authenticated;
grant execute on function public.may_replace_photo(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.submissions enable row level security;
alter table public.votes enable row level security;

create policy "Participants can read profiles"
  on public.profiles for select to authenticated using (true);
create policy "Participants create their profile"
  on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Participants update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Participants can read challenges"
  on public.challenges for select to authenticated using (true);

create policy "Participants can read submissions"
  on public.submissions for select to authenticated using (true);
create policy "Participants create their submissions"
  on public.submissions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Participants update their submissions"
  on public.submissions for update to authenticated
  using (public.may_change_submission(id, user_id))
  with check ((select auth.uid()) = user_id);
create policy "Participants delete their submissions"
  on public.submissions for delete to authenticated
  using (public.may_change_submission(id, user_id));

create policy "Participants can read their votes"
  on public.votes for select to authenticated using (voter_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Participants can view party photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (select 1 from public.profiles where user_id = (select auth.uid()))
  );
create policy "Participants upload to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Participants replace their photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and owner_id = (select auth.uid())::text
    and public.may_replace_photo(name)
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Participants delete their photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and owner_id = (select auth.uid())::text
    and public.may_replace_photo(name)
  );

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

create view public.challenge_results
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

create view public.leaderboard
with (security_invoker = true)
as
select
  profiles.user_id,
  profiles.display_name,
  coalesce(sum(challenge_results.points), 0)::integer as points,
  count(*) filter (where challenge_results.place = 1 and challenge_results.vote_count > 0)::integer as wins
from public.profiles
left join public.challenge_results on challenge_results.user_id = profiles.user_id
group by profiles.user_id, profiles.display_name;

grant select on public.challenge_results, public.leaderboard to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes'
  ) then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;
