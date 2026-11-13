-- Muscu Tracker — autres activités (course, padel, badminton, foot, tennis, squash...)
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null,
  started_at timestamptz not null default now(),
  duration_minutes int not null,
  distance_km numeric,
  notes text
);

create index if not exists activities_user_idx on activities(user_id, started_at desc);

alter table activities enable row level security;

create policy "own activities" on activities for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
