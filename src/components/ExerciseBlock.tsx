import { useEffect, useState } from 'react'
import type { Exercise, SetRow } from '../lib/types'
import { suggestNextWeight } from '../lib/suggestions'
import { useExerciseHistory } from '../hooks/useData'
import { formatSeconds } from '../lib/time'
import { formatPlates } from '../lib/plates'
import { warmupSets } from '../lib/warmup'
import ExerciseGymCard from './ExerciseGymCard'

type Props = {
  exercise: Exercise
  gymId: string | null
  sets: SetRow[]
  pendingIds: Set<string>
  sessionRestElapsed: number | null
  onAddSet: (params: { exerciseId: string; weightKg: number; reps: number; restSeconds: number | null }) => Promise<void>
  onRemoveSet: (id: string) => Promise<void>
  onRemoveExercise: () => void
}

export default function ExerciseBlock({
  exercise,
  gymId,
  sets,
  pendingIds,
  sessionRestElapsed,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: Props) {
  const { history, refresh: refreshHistory } = useExerciseHistory(exercise.id, gymId)
  const suggestion = suggestNextWeight(exercise, history)

  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [restOverride, setRestOverride] = useState<string>('')
  const [showTools, setShowTools] = useState(false)
  const [prMessage, setPrMessage] = useState<string | null>(null)

  // Pré-remplit avec la suggestion dès qu'elle arrive (l'historique charge après le 1er rendu),
  // tant que l'utilisateur n'a pas encore saisi de série ce tour-ci.
  useEffect(() => {
    if (sets.length === 0 && suggestion) {
      setWeight(suggestion.weight.toString())
      setReps(suggestion.reps.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.weight, suggestion?.reps])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (Number.isNaN(w) || Number.isNaN(r)) return
    const rest = restOverride ? parseInt(restOverride, 10) : sessionRestElapsed

    // "Déjà fait" inclut les séries plus tôt dans CETTE séance : si tu as déjà posé 16.5kg
    // aujourd'hui et que tu en refais plus de reps, c'est un record de reps, pas de poids.
    const maxWeightEver = history.length ? Math.max(...history.map((s) => s.weight_kg)) : 0
    const repsAtThisWeight = history.filter((s) => s.weight_kg === w).map((s) => s.reps)
    const maxRepsAtThisWeight = repsAtThisWeight.length ? Math.max(...repsAtThisWeight) : 0
    const isRecord = w > maxWeightEver || (w === maxWeightEver && r > maxRepsAtThisWeight) || (w < maxWeightEver && repsAtThisWeight.length > 0 && r > maxRepsAtThisWeight)

    await onAddSet({ exerciseId: exercise.id, weightKg: w, reps: r, restSeconds: rest })
    setRestOverride('')
    await refreshHistory()
    if (isRecord) {
      setPrMessage(w > maxWeightEver ? `🎉 Nouveau record de poids : ${w} kg !` : `🎉 Nouveau record de reps à ${w} kg : ${r} !`)
      setTimeout(() => setPrMessage(null), 4000)
    }
  }

  const removeExercise = () => {
    if (sets.length === 0 || confirm(`Supprimer "${exercise.name}" et ses ${sets.length} série(s) de cette séance ?`)) {
      for (const s of sets) onRemoveSet(s.id)
      onRemoveExercise()
    }
  }

  const weightNum = parseFloat(weight)
  const plateText = !Number.isNaN(weightNum) ? formatPlates(weightNum) : null
  const warmup = !Number.isNaN(weightNum) ? warmupSets(weightNum, exercise.weight_increment || 2.5) : []

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-white">{exercise.name}</h3>
        <button
          type="button"
          onClick={removeExercise}
          className="shrink-0 text-slate-500 hover:text-red-400"
          aria-label="Retirer cet exercice de la séance"
        >
          🗑️
        </button>
      </div>

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

      {prMessage && (
        <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300">
          {prMessage}
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
                {pendingIds.has(s.id) && (
                  <span className="ml-1 text-amber-400" title="Pas encore synchronisé (hors-ligne)">
                    ⏳
                  </span>
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
            placeholder={sessionRestElapsed !== null ? String(sessionRestElapsed) : '—'}
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

        {(plateText || warmup.length > 0) && (
          <button
            type="button"
            onClick={() => setShowTools((v) => !v)}
            className="rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-300"
          >
            🔧 Plaques / échauffement
          </button>
        )}
      </form>

      {showTools && (plateText || warmup.length > 0) && (
        <div className="mt-2 rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
          {plateText && <p>🔩 Plaques à charger (par côté) : {plateText}</p>}
          {warmup.length > 0 && (
            <p className="mt-1">
              🔥 Séries d'échauffement avant ce poids : {warmup.map((s) => `${s.weight} kg × ${s.reps}`).join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
