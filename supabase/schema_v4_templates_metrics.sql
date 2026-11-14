-- Muscu Tracker — templates de séance + poids de corps
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query

create table if not exists session_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exercise_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists session_templates_user_idx on session_templates(user_id, created_at desc);

alter table session_templates enable row level security;

create policy "own templates" on session_templates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists body_metrics_user_idx on body_metrics(user_id, date desc);

alter table body_metrics enable row level security;

create policy "own body metrics" on body_metrics for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
