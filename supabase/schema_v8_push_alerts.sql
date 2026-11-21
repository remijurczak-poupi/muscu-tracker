-- Muscu Tracker — notifications push pour le chrono de repos
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists rest_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references workout_sessions(id) on delete cascade,
  warning_at timestamptz not null,
  alert_at timestamptz not null,
  sent_warning boolean not null default false,
  sent_alert boolean not null default false,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rest_alerts_due_idx on rest_alerts(cancelled, sent_alert, alert_at);
create index if not exists rest_alerts_session_idx on rest_alerts(session_id);

alter table push_subscriptions enable row level security;
alter table rest_alerts enable row level security;

create policy "own push subscriptions" on push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rest alerts" on rest_alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
