-- Rank the overall leaderboard by every vote a guest received across all
-- challenge submissions. Keep the existing points column so an older deployed
-- client remains usable while the static site and database roll out separately.

create or replace view public.leaderboard
with (security_invoker = true)
as
select
  profiles.user_id,
  profiles.display_name,
  coalesce(sum(challenge_results.points), 0)::integer as points,
  count(*) filter (where challenge_results.place = 1 and challenge_results.vote_count > 0)::integer as wins,
  coalesce(sum(challenge_results.vote_count), 0)::integer as votes
from public.profiles
left join public.challenge_results on challenge_results.user_id = profiles.user_id
group by profiles.user_id, profiles.display_name;

grant select on public.leaderboard to authenticated;
