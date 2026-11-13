import { useState } from 'react'
import { useGyms, useExercises } from '../hooks/useData'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { gyms, addGym, removeGym } = useGyms()
  const { exercises, removeExercise } = useExercises()
  const { session } = useAuth()
  const [newGym, setNewGym] = useState('')

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-4 text-lg font-bold text-white">Réglages</h1>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Salles</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!newGym.trim()) return
            await addGym(newGym.trim())
            setNewGym('')
          }}
          className="mb-2 flex gap-2"
        >
          <input
            value={newGym}
            onChange={(e) => setNewGym(e.target.value)}
            placeholder="Nom de la salle"
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
          />
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white">
            Ajouter
          </button>
        </form>
        <ul className="flex flex-col gap-1">
          {gyms.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-md bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
            >
              {g.name}
              <button
                type="button"
                onClick={() => removeGym(g.id)}
                className="text-slate-500 hover:text-red-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Exercices</h2>
        <p className="mb-2 text-xs text-slate-500">
          Les nouveaux exercices se créent depuis l'onglet Séance.
        </p>
        <ul className="flex flex-col gap-1">
          {exercises.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-md bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
            >
              {e.name}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Supprimer "${e.name}" et tout son historique ?`)) removeExercise(e.id)
                }}
                className="text-slate-500 hover:text-red-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="mb-2 text-xs text-slate-500">Connecté en tant que {session?.user.email}</p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white"
        >
          Se déconnecter
        </button>
      </section>
    </div>
  )
}
