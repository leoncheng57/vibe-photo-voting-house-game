-- Host-configurable appearance and winner mode.
--
-- Settings live on the existing single-row party_settings table, which stays
-- fully revoked from clients. Reads go through a security-definer RPC gated on
-- membership; writes are gated on a bcrypt host PIN using the same crypt()
-- pattern as set_party_passphrase (004/005), because the app has no host role:
-- auth is anonymous and every guest is an equal member.

alter table public.party_settings
  add column if not exists host_pin_hash text,
  add column if not exists theme jsonb not null default '{}'::jsonb,
  add column if not exists winner_mode text not null default 'voting';

alter table public.party_settings
  drop constraint if exists party_settings_winner_mode_valid;
alter table public.party_settings
  add constraint party_settings_winner_mode_valid
  check (winner_mode in ('voting', 'random'));

-- Members read settings; the PIN hash is never exposed.
create or replace function public.get_game_settings()
returns table (theme jsonb, winner_mode text, host_pin_set boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_member() then
    raise exception 'Join the party first.';
  end if;

  return query
  select s.theme, s.winner_mode, s.host_pin_hash is not null
  from public.party_settings s
  where s.id;
end;
$$;

-- Host PIN is set out of band in the SQL editor, exactly like the passphrase.
create or replace function public.set_host_pin(new_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new_pin is null or length(trim(new_pin)) = 0 then
    raise exception 'Host PIN cannot be empty.';
  end if;

  update public.party_settings
  set host_pin_hash = crypt(new_pin, gen_salt('bf', 10)),
      updated_at = now()
  where id;
end;
$$;

create or replace function public.update_game_settings(
  host_pin text,
  new_theme jsonb,
  new_winner_mode text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  if not public.is_member() then
    raise exception 'Join the party first.';
  end if;

  select host_pin_hash into stored_hash from public.party_settings where id;

  if stored_hash is null then
    raise exception 'No host PIN is set. Run set_host_pin first.';
  end if;

  if host_pin is null or crypt(host_pin, stored_hash) <> stored_hash then
    raise exception 'Incorrect host PIN.';
  end if;

  if new_winner_mode is not null and new_winner_mode not in ('voting', 'random') then
    raise exception 'Unknown winner mode.';
  end if;

  update public.party_settings
  set theme = coalesce(new_theme, theme),
      winner_mode = coalesce(new_winner_mode, winner_mode),
      updated_at = now()
  where id;
end;
$$;

revoke all on function public.set_host_pin(text) from public, anon, authenticated;
grant execute on function public.get_game_settings() to authenticated;
grant execute on function public.update_game_settings(text, jsonb, text) to authenticated;
