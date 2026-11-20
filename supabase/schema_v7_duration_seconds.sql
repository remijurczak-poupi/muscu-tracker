-- Muscu Tracker — durée des "autres sports" en secondes (précision h:min:sec)
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query

alter table activities rename column duration_minutes to duration_seconds;
update activities set duration_seconds = duration_seconds * 60;
