import { useMemo, useRef, useState } from 'react'
import { useActiveSession } from '../hooks/useActiveSession'
import { useSessionSets } from '../hooks/useSessionSets'
import { useExercises, useGyms } from '../hooks/useData'
import ExerciseBlock from '../components/ExerciseBlock'
import AddExercisePicker from '../components/AddExercisePicker'
import { formatDateTime } from '../lib/time'

export default function Home() {
  const { session, loading: sessionLoading, startSession, endSession } = useActiveSession()
  const { gyms, addGym } = useGyms()
  const { exercises, addExercise } = useExercises()
  const { sets, addSet, removeSet } = useSessionSets(session?.id ?? null)
  const [selectedGym, setSelectedGym] = useState<string>('')
  const [sessionExerciseIds, setSessionExerciseIds] = useState<string[]>([])
  const [starting, setStarting] = useState(false)
  const startingRef = useRef(false)

  const exerciseIdsInSession = useMemo(() => {
    const fromSets = sets.map((s) => s.exercise_id)
    return Array.from(new Set([...fromSets, ...sessionExerciseIds]))
  }, [sets, sessionExerciseIds])

  if (sessionLoading) {
    return <div className="p-6 text-center text-slate-500">Chargement…</div>
  }

  if (!session) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-xl font-bold text-white">Prêt à t'entraîner ?</h1>
        <div className="w-full max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">Salle (optionnel)</label>
          <select
            value={selectedGym}
            onChange={(e) => setSelectedGym(e.target.value)}
            className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="">—</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <GymQuickAdd onAdd={addGym} />
          <button
            type="button"
            disabled={starting}
            onClick={async () => {
              if (startingRef.current) return
              startingRef.current = true
              setStarting(true)
              try {
                await startSession(selectedGym || null)
              } finally {
                startingRef.current = false
                setStarting(false)
              }
            }}
            className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            {starting ? 'Démarrage…' : 'Démarrer la séance'}
          </button>
        </div>
      </div>
    )
  }

  const gym = gyms.find((g) => g.id === session.gym_id)

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Séance en cours</h1>
          <p className="text-xs text-slate-500">
            {gym ? `${gym.name} · ` : ''}
            depuis {formatDateTime(session.started_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('Terminer la séance ?')) endSession()
          }}
          className="rounded-md bg-emerald-600/90 px-3 py-2 text-sm font-semibold text-white"
        >
          Terminer
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {exerciseIdsInSession.map((exId) => {
          const exercise = exercises.find((e) => e.id === exId)
          if (!exercise) return null
          return (
            <ExerciseBlock
              key={exId}
              exercise={exercise}
              sessionId={session.id}
              gymId={session.gym_id}
              sets={sets.filter((s) => s.exercise_id === exId)}
              onAddSet={addSet}
              onRemoveSet={removeSet}
            />
          )
        })}

        <AddExercisePicker
          exercises={exercises}
          excludeIds={exerciseIdsInSession}
          onPick={(id) => setSessionExerciseIds((ids) => [...ids, id])}
          onCreate={(name) => addExercise(name, null)}
        />
      </div>
    </div>
  )
}

function GymQuickAdd({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        await onAdd(name.trim())
        setName('')
      }}
      className="flex gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nouvelle salle"
        className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
      />
      <button type="submit" className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white">
        +
      </button>
    </form>
  )
}
