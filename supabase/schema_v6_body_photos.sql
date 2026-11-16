-- Muscu Tracker — photo associée à une entrée de poids de corps
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query

alter table body_metrics add column if not exists photo_path text;

-- Réutilise le bucket de photos existant (policies déjà en place, écriture restreinte
-- au dossier de l'utilisateur) : les photos de corps vont sous <user_id>/body/<id>.
