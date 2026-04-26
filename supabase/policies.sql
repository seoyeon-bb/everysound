-- RLS: anon/authenticated can SELECT only. all writes go through server (service_role bypasses RLS).

alter table public.sounds            enable row level security;
alter table public.recommendations   enable row level security;
alter table public.launchpads        enable row level security;
alter table public.launchpad_sounds  enable row level security;
alter table public.stage_recordings  enable row level security;
alter table public.stage_likes       enable row level security;

-- public read
drop policy if exists sounds_read           on public.sounds;
drop policy if exists recommendations_read  on public.recommendations;
drop policy if exists launchpads_read       on public.launchpads;
drop policy if exists launchpad_sounds_read on public.launchpad_sounds;
drop policy if exists stage_recordings_read on public.stage_recordings;
drop policy if exists stage_likes_read      on public.stage_likes;

create policy sounds_read           on public.sounds            for select to anon, authenticated using (true);
create policy recommendations_read  on public.recommendations   for select to anon, authenticated using (true);
create policy launchpads_read       on public.launchpads        for select to anon, authenticated using (true);
create policy launchpad_sounds_read on public.launchpad_sounds  for select to anon, authenticated using (true);
create policy stage_recordings_read on public.stage_recordings  for select to anon, authenticated using (true);
create policy stage_likes_read      on public.stage_likes       for select to anon, authenticated using (true);

-- no INSERT/UPDATE/DELETE policies for anon → all writes blocked except service_role
