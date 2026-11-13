import { useState } from 'react'
import type { Exercise, SetRow } from '../lib/types'
import { suggestNextWeight } from '../lib/suggestions'
import { useExerciseHistory } from '../hooks/useData'
import { useElapsed } from '../hooks/useElapsed'
import { formatSeconds } from '../lib/time'
import ExerciseGymCard from './ExerciseGymCard'

type Props = {
  exercise: Exercise
  sessionId: string
  gymId: string | null
  sets: SetRow[]
  onAddSet: (params: { exerciseId: string; weightKg: number; reps: number; restSeconds: number | null }) => Promise<void>
  onRemoveSet: (id: string) => Promise<void>
}

export default function ExerciseBlock({ exercise, sessionId, gymId, sets, onAddSet, onRemoveSet }: Props) {
  const { history } = useExerciseHistory(exercise.id)
  const priorHistory = history.filter((s) => s.session_id !== sessionId)
  const suggestion = suggestNextWeight(exercise, priorHistory)

  const lastSetAt = sets.length > 0 ? new Date(sets[sets.length - 1].created_at).getTime() : null
  const elapsed = useElapsed(lastSetAt)

  const [weight, setWeight] = useState(() => suggestion?.weight?.toString() ?? '')
  const [reps, setReps] = useState(() => suggestion?.reps?.toString() ?? '')
  const [restOverride, setRestOverride] = useState<string>('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (Number.isNaN(w) || Number.isNaN(r)) return
    const rest = restOverride ? parseInt(restOverride, 10) : sets.length > 0 ? elapsed : null
    await onAddSet({ exerciseId: exercise.id, weightKg: w, reps: r, restSeconds: rest })
    setRestOverride('')
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-2 font-semibold text-white">{exercise.name}</h3>

      {gymId ? (
        <ExerciseGymCard exerciseId={exercise.id} gymId={gymId} />
      ) : (
        <p className="mb-3 text-xs text-slate-600">
          Choisis une salle pour activer la photo et les notes technique.
        </p>
      )}

      {suggestion && sets.length === 0 && (
        <p className="mb-3 rounded-lg bg-indigo-500/10 px-3 py-2 text-sm text-indigo-300">
          💡 {suggestion.message}
        </p>
      )}

      {sets.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5">
          {sets.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-200"
            >
              <span>
                Série {i + 1} — <b>{s.weight_kg} kg</b> × {s.reps}
                {s.rest_seconds !== null && (
                  <span className="text-slate-500"> · repos {formatSeconds(s.rest_seconds)}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onRemoveSet(s.id)}
                className="text-slate-500 hover:text-red-400"
                aria-label="Supprimer la série"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {sets.length > 0 && (
        <p className="mb-2 text-xs text-slate-500">Repos en cours : {formatSeconds(elapsed)}</p>
      )}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-slate-400">
          Poids (kg)
          <input
            type="number"
            step="0.5"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1 w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
            required
          />
        </label>
        <label className="flex flex-col text-xs text-slate-400">
          Reps
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="mt-1 w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
            required
          />
        </label>
        <label className="flex flex-col text-xs text-slate-400">
          Repos (s)
          <input
            type="number"
            inputMode="numeric"
            placeholder={sets.length > 0 ? String(elapsed) : '—'}
            value={restOverride}
            onChange={(e) => setRestOverride(e.target.value)}
            className="mt-1 w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white placeholder-slate-600"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Ajouter
        </button>
      </form>
    </div>
  )
}
