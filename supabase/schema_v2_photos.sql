-- Muscu Tracker — ajout photo/notes technique/tuto par duo (exercice, salle)
-- À exécuter une fois en plus de schema.sql, dans le SQL Editor Supabase.

create table if not exists exercise_gym_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  photo_path text,
  technique_notes text,
  video_url text,
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_id, gym_id)
);

alter table exercise_gym_notes enable row level security;

create policy "own exercise gym notes" on exercise_gym_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Stockage des photos de machines. Bucket public en lecture (URLs non devinables),
-- écriture restreinte au dossier de l'utilisateur (premier segment du chemin = son user id).
insert into storage.buckets (id, name, public)
values ('exercise-photos', 'exercise-photos', true)
on conflict (id) do nothing;

create policy "exercise photos public read" on storage.objects for select
  using (bucket_id = 'exercise-photos');

create policy "exercise photos own write" on storage.objects for insert
  with check (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "exercise photos own update" on storage.objects for update
  using (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "exercise photos own delete" on storage.objects for delete
  using (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = auth.uid()::text);
