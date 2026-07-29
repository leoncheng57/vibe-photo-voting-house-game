-- Remove the 12-character passphrase minimum.
--
-- The host chooses the passphrase strength. Any non-empty value is accepted;
-- longer phrases still resist online guessing better, which the developer
-- documentation continues to recommend.

create or replace function public.set_party_passphrase(new_passphrase text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new_passphrase is null or length(trim(new_passphrase)) = 0 then
    raise exception 'Passphrase cannot be empty.';
  end if;

  update public.party_settings
  set passphrase_hash = crypt(new_passphrase, gen_salt('bf', 10)),
      updated_at = now();
end;
$$;

revoke all on function public.set_party_passphrase(text) from public, anon, authenticated;
