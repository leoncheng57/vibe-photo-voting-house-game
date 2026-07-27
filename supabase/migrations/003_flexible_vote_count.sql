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
