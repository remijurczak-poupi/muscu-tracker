-- Muscu Tracker — planification des notifications push (toutes les ~15s)
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query
-- Nécessite les extensions pg_cron et pg_net (activées par défaut sur Supabase).
--
-- IMPORTANT : remplace <CRON_SECRET> ci-dessous (4 occurrences) par la valeur de la variable
-- d'environnement Vercel CRON_SECRET avant d'exécuter ce script. Ne jamais commiter ce fichier
-- avec le secret en clair.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- pg_cron ne descend pas sous la minute : on programme 4 déclenchements décalés
-- de 15s à l'intérieur de chaque minute pour approcher un intervalle de ~15s.
select cron.schedule(
  'send-rest-alerts-0',
  '* * * * *',
  $$ select net.http_post(
    url := 'https://muscu-tracker-gold.vercel.app/api/send-rest-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  ); $$
);

select cron.schedule(
  'send-rest-alerts-15',
  '* * * * *',
  $$ select pg_sleep(15); select net.http_post(
    url := 'https://muscu-tracker-gold.vercel.app/api/send-rest-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  ); $$
);

select cron.schedule(
  'send-rest-alerts-30',
  '* * * * *',
  $$ select pg_sleep(30); select net.http_post(
    url := 'https://muscu-tracker-gold.vercel.app/api/send-rest-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  ); $$
);

select cron.schedule(
  'send-rest-alerts-45',
  '* * * * *',
  $$ select pg_sleep(45); select net.http_post(
    url := 'https://muscu-tracker-gold.vercel.app/api/send-rest-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  ); $$
);
