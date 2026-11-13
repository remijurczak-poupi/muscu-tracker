-- Muscu Tracker — schéma Supabase
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query

create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text,
  weight_increment numeric not null default 2.5,
  created_at timestamptz not null default now()
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid references gyms(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);

create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_index int not null,
  weight_kg numeric not null,
  reps int not null,
  rest_seconds int,
  created_at timestamptz not null default now()
);

create index if not exists sets_exercise_idx on sets(user_id, exercise_id, created_at desc);
create index if not exists sessions_user_idx on workout_sessions(user_id, started_at desc);

alter table gyms enable row level security;
alter table exercises enable row level security;
alter table workout_sessions enable row level security;
alter table sets enable row level security;

create policy "own gyms" on gyms for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exercises" on exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on workout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sets" on sets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
