delete from public.challenges where id in (6, 8);

update public.challenges
set sort_order = 6
where id = 7;
