import { useMemo, useRef, useState } from 'react'
import { useActiveSession } from '../hooks/useActiveSession'
import { useSessionSets } from '../hooks/useSessionSets'
import { useExercises, useGyms, useActivities } from '../hooks/useData'
import { useElapsed } from '../hooks/useElapsed'
import ExerciseBlock from '../components/ExerciseBlock'
import AddExercisePicker from '../components/AddExercisePicker'
import RestTimer from '../components/RestTimer'
import { formatDuration, formatMinutes, formatDateTime } from '../lib/time'
import { SPORTS, sportIcon, sportLabel } from '../lib/sports'

function tabClass(active: boolean): string {
  return `flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold ${
    active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
  }`
}

export default function Home() {
  const [mode, setMode] = useState<'muscu' | 'sport'>('muscu')
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

  const lastSetAt = useMemo(() => {
    if (sets.length === 0) return null
    return Math.max(...sets.map((s) => new Date(s.created_at).getTime()))
  }, [sets])
  const restElapsed = useElapsed(lastSetAt)
  const totalElapsed = useElapsed(session ? new Date(session.started_at).getTime() : null)

  const gym = gyms.find((g) => g.id === session?.gym_id)

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setMode('muscu')} className={tabClass(mode === 'muscu')}>
          🏋️ Musculation
        </button>
        <button type="button" onClick={() => setMode('sport')} className={tabClass(mode === 'sport')}>
          🏃 Autre sport
        </button>
      </div>

      {mode === 'sport' ? (
        <SportLogger />
      ) : sessionLoading ? (
        <div className="py-12 text-center text-slate-500">Chargement…</div>
      ) : !session ? (
        <div className="flex flex-col items-center gap-4 py-8">
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
      ) : (
        <>
          <div className="sticky top-0 z-10 -mx-4 bg-slate-950/95 px-4 pb-3 pt-2 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white">Séance en cours</h1>
                <p className="text-xs text-slate-500">
                  {gym ? `${gym.name} · ` : ''}
                  Durée totale : <span className="tabular-nums">{formatDuration(totalElapsed)}</span>
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

            {lastSetAt !== null && <RestTimer elapsed={restElapsed} />}
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
                  sessionRestElapsed={lastSetAt !== null ? restElapsed : null}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                />
              )
            })}

            <AddExercisePicker
              exercises={exercises}
              excludeIds={exerciseIdsInSession}
              onPick={(id) => setSessionExerciseIds((ids) => [...ids, id])}
              onCreate={(name, muscleGroup) => addExercise(name, muscleGroup)}
            />
          </div>
        </>
      )}
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

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SportLogger() {
  const { activities, addActivity, removeActivity } = useActivities(5)
  const [sport, setSport] = useState(SPORTS[0].key)
  const [durH, setDurH] = useState('')
  const [durM, setDurM] = useState('')
  const [distance, setDistance] = useState('')
  const [date, setDate] = useState(() => toLocalInputValue(new Date()))
  const [saving, setSaving] = useState(false)

  const def = SPORTS.find((s) => s.key === sport) ?? SPORTS[0]
  const totalMinutes = (parseInt(durH || '0', 10) || 0) * 60 + (parseInt(durM || '0', 10) || 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalMinutes <= 0) return
    const km = def.hasDistance && distance ? parseFloat(distance) : null
    setSaving(true)
    try {
      await addActivity({
        sport,
        startedAt: new Date(date).toISOString(),
        durationMinutes: totalMinutes,
        distanceKm: km,
      })
      setDurH('')
      setDurM('')
      setDistance('')
      setDate(toLocalInputValue(new Date()))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSport(s.key)}
              className={`rounded-lg px-3 py-2 text-sm ${
                sport === s.key ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-slate-400">
            Durée
            <span className="mt-1 flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={durH}
                onChange={(e) => setDurH(e.target.value)}
                placeholder="0"
                className="w-14 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
              />
              <span className="text-slate-500">h</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={durM}
                onChange={(e) => setDurM(e.target.value)}
                placeholder="00"
                className="w-14 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
              />
              <span className="text-slate-500">min</span>
            </span>
          </label>

          {def.hasDistance && (
            <label className="flex flex-col text-xs text-slate-400">
              Distance (km)
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="mt-1 w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
              />
            </label>
          )}

          <label className="flex flex-col text-xs text-slate-400">
            Quand
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      {activities.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Dernières activités</p>
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3"
            >
              <div className="text-sm text-slate-200">
                <span className="mr-1">{sportIcon(a.sport)}</span>
                <span className="font-semibold">{sportLabel(a.sport)}</span>
                <span className="text-slate-500"> · {formatMinutes(a.duration_minutes)}</span>
                {a.distance_km !== null && <span className="text-slate-500"> · {a.distance_km} km</span>}
                <p className="text-xs text-slate-600">{formatDateTime(a.started_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeActivity(a.id)}
                className="text-slate-500 hover:text-red-400"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
