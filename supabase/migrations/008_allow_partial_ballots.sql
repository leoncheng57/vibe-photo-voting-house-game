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

  if selected_count < 1 or selected_count > vote_limit then
    raise exception 'Choose between 1 and % different photo(s)', vote_limit;
  end if;

  if (select count(distinct item) from unnest(selected_submission_ids) item) <> selected_count then
    raise exception 'Every vote must select a different photo';
  end if;

  select count(*) into valid_count
  from public.submissions
  where challenge_id = selected_challenge_id
    and id = any(selected_submission_ids);

  if valid_count <> selected_count then
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
