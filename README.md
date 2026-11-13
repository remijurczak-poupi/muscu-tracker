# Muscu Tracker

PWA de suivi de musculation (séries, poids, répétitions, repos, salle) avec suggestion de
charge basée sur l'historique.

## Stack

- Vite + React + TypeScript + Tailwind CSS v4
- Supabase (base de données + auth)
- Recharts (graphiques de progression)

## Développement

```bash
npm install
cp .env.example .env.local   # puis renseigner VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

Le schéma de base de données est dans [`supabase/schema.sql`](supabase/schema.sql) — à exécuter
une fois dans le SQL Editor du projet Supabase.
