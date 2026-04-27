-- Atomic swap/move for launchpad positions without bumping launchpad_add_count.
-- Uses session_replication_role = replica to skip the per-row INSERT trigger
-- that increments sounds.launchpad_add_count.
--
-- Signature uses integer (not smallint) so Supabase JS rpc(...) auto-resolves
-- to this function via PostgREST's schema cache.

create or replace function public.swap_launchpad_positions(
  p_device_id uuid,
  p_from integer,
  p_to integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_sound uuid;
  v_to_sound uuid;
begin
  if p_from = p_to then return; end if;
  if p_from < 0 or p_from > 11 or p_to < 0 or p_to > 11 then
    raise exception 'invalid position';
  end if;

  select sound_id into v_from_sound
    from public.launchpad_sounds
    where device_id = p_device_id and position = p_from;

  select sound_id into v_to_sound
    from public.launchpad_sounds
    where device_id = p_device_id and position = p_to;

  if v_from_sound is null then
    return;
  end if;

  set local session_replication_role = replica;

  delete from public.launchpad_sounds
    where device_id = p_device_id
      and position in (p_from, p_to);

  insert into public.launchpad_sounds (device_id, position, sound_id)
    values (p_device_id, p_to, v_from_sound);

  if v_to_sound is not null then
    insert into public.launchpad_sounds (device_id, position, sound_id)
      values (p_device_id, p_from, v_to_sound);
  end if;
end;
$$;

-- If a smallint version was created earlier, drop it so PostgREST resolves to the integer one
drop function if exists public.swap_launchpad_positions(uuid, smallint, smallint);
