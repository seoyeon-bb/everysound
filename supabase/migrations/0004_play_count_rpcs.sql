-- Atomic play_count bump for sounds and stage_recordings.
-- Called from /api/sounds/[id]/play and /api/stage/[id]/play.

create or replace function public.bump_sound_play(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.sounds
     set play_count = play_count + 1
   where id = p_id;
$$;

create or replace function public.bump_stage_play(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stage_recordings
     set play_count = play_count + 1
   where id = p_id;
$$;

notify pgrst, 'reload schema';
