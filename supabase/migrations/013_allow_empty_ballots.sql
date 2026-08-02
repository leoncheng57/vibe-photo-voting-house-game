-- Allow a guest to clear a previously submitted ballot by submitting empty
-- selection and storage-path arrays. Non-empty ballots retain the immutable
-- path validation that prevents voting against a replaced photo.

create or replace function public.submit_votes(
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

  if selected_count > vote_limit
     or cardinality(selected_storage_paths) <> selected_count then
    raise exception 'Choose up to % different photo(s)', vote_limit;
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
