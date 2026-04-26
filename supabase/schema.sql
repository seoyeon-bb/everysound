-- everysound schema
-- run in Supabase SQL Editor (one-shot). idempotent-ish: drops triggers before recreate.

-- ===== sounds =====
create table if not exists public.sounds (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null,
  uploader_nickname text,
  title text not null,
  summary text not null,
  description text,
  audio_key text,
  duration_ms int check (duration_ms is null or (duration_ms between 0 and 3000)),
  category text not null,
  tags text[] not null default '{}'::text[] check (array_length(tags, 1) is null or array_length(tags, 1) <= 3),
  pitch text,
  pitch_hz real,
  play_count int not null default 0,
  launchpad_add_count int not null default 0,
  recommend_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sounds_category_play_idx    on public.sounds (category, play_count desc);
create index if not exists sounds_category_added_idx   on public.sounds (category, launchpad_add_count desc);
create index if not exists sounds_category_created_idx on public.sounds (category, created_at desc);
create index if not exists sounds_device_idx           on public.sounds (device_id);
create index if not exists sounds_tags_gin_idx         on public.sounds using gin (tags);
create index if not exists sounds_pitch_idx            on public.sounds (pitch);

-- ===== recommendations =====
create table if not exists public.recommendations (
  sound_id uuid not null references public.sounds(id) on delete cascade,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (sound_id, device_id)
);

create or replace function public.bump_sound_recommend_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.sounds set recommend_count = recommend_count + 1 where id = new.sound_id;
  elsif (tg_op = 'DELETE') then
    update public.sounds set recommend_count = greatest(recommend_count - 1, 0) where id = old.sound_id;
  end if;
  return null;
end; $$;

drop trigger if exists recommendations_bump on public.recommendations;
create trigger recommendations_bump
  after insert or delete on public.recommendations
  for each row execute function public.bump_sound_recommend_count();

-- ===== launchpads =====
create table if not exists public.launchpads (
  device_id uuid primary key,
  name text not null default 'My Launchpad',
  updated_at timestamptz not null default now()
);

-- ===== launchpad_sounds =====
create table if not exists public.launchpad_sounds (
  device_id uuid not null references public.launchpads(device_id) on delete cascade,
  position smallint not null check (position between 0 and 11),
  sound_id uuid not null references public.sounds(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (device_id, position)
);

create or replace function public.bump_sound_launchpad_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.sounds set launchpad_add_count = launchpad_add_count + 1 where id = new.sound_id;
  elsif (tg_op = 'DELETE') then
    update public.sounds set launchpad_add_count = greatest(launchpad_add_count - 1, 0) where id = old.sound_id;
  end if;
  return null;
end; $$;

drop trigger if exists launchpad_sounds_bump on public.launchpad_sounds;
create trigger launchpad_sounds_bump
  after insert or delete on public.launchpad_sounds
  for each row execute function public.bump_sound_launchpad_count();

-- ===== stage_recordings =====
create table if not exists public.stage_recordings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null,
  uploader_nickname text,
  title text not null,
  summary text not null,
  audio_key text,
  duration_ms int check (duration_ms is null or (duration_ms between 0 and 60000)),
  play_count int not null default 0,
  like_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stage_recordings_play_idx    on public.stage_recordings (play_count desc);
create index if not exists stage_recordings_like_idx    on public.stage_recordings (like_count desc);
create index if not exists stage_recordings_created_idx on public.stage_recordings (created_at desc);

-- ===== stage_likes =====
create table if not exists public.stage_likes (
  recording_id uuid not null references public.stage_recordings(id) on delete cascade,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (recording_id, device_id)
);

create or replace function public.bump_stage_like_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.stage_recordings set like_count = like_count + 1 where id = new.recording_id;
  elsif (tg_op = 'DELETE') then
    update public.stage_recordings set like_count = greatest(like_count - 1, 0) where id = old.recording_id;
  end if;
  return null;
end; $$;

drop trigger if exists stage_likes_bump on public.stage_likes;
create trigger stage_likes_bump
  after insert or delete on public.stage_likes
  for each row execute function public.bump_stage_like_count();
