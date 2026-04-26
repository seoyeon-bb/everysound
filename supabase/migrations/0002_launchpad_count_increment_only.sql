-- Migration: launchpad_add_count becomes "ever-added counter" (no decrement on remove)
-- Run in Supabase SQL Editor.

create or replace function public.bump_sound_launchpad_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.sounds
       set launchpad_add_count = launchpad_add_count + 1
     where id = new.sound_id;
  end if;
  return null;
end; $$;
