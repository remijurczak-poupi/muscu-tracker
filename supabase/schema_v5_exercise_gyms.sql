-- Muscu Tracker — lie chaque exercice à la ou les salles où il est disponible
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query

create table if not exists exercise_gyms (
  exercise_id uuid not null references exercises(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exercise_id, gym_id)
);

create index if not exists exercise_gyms_gym_idx on exercise_gyms(gym_id);

alter table exercise_gyms enable row level security;

create policy "own exercise_gyms" on exercise_gyms for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Backfill : relie automatiquement chaque exercice à toutes les salles où il a déjà été fait.
insert into exercise_gyms (exercise_id, gym_id, user_id)
select distinct s.exercise_id, ws.gym_id, s.user_id
from sets s
join workout_sessions ws on ws.id = s.session_id
where ws.gym_id is not null
on conflict do nothing;
