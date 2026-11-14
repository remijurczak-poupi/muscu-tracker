import { useState } from 'react'
import { useSessions, useExercises, useGyms, useActivities, useWeekStats } from '../hooks/useData'
import { useSessionSets } from '../hooks/useSessionSets'
import { formatDateTime, formatSeconds, formatMinutes } from '../lib/time'
import { sportIcon, sportLabel } from '../lib/sports'
import type { Activity, SetRow, WorkoutSession } from '../lib/types'

type Item =
  | { kind: 'session'; at: number; session: WorkoutSession }
  | { kind: 'activity'; at: number; activity: Activity }

export default function History() {
  const { sessions, loading: sessionsLoading, removeSession } = useSessions()
  const { activities, loading: activitiesLoading, removeActivity } = useActivities()
  const { gyms } = useGyms()
  const { exercises } = useExercises()
  const [openId, setOpenId] = useState<string | null>(null)

  if (sessionsLoading || activitiesLoading) {
    return <div className="p-6 text-center text-slate-500">Chargement…</div>
  }

  const items: Item[] = [
    ...sessions.map((s) => ({ kind: 'session' as const, at: new Date(s.started_at).getTime(), session: s })),
    ...activities.map((a) => ({ kind: 'activity' as const, at: new Date(a.started_at).getTime(), activity: a })),
  ].sort((a, b) => b.at - a.at)

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-4 text-lg font-bold text-white">Historique</h1>
      <WeekSummary />
      {items.length === 0 && (
        <p className="text-sm text-slate-500">Aucune séance enregistrée pour l'instant.</p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((item) =>
          item.kind === 'session' ? (
            <SessionCard
              key={item.session.id}
              s={item.session}
              gymName={gyms.find((g) => g.id === item.session.gym_id)?.name}
              exercises={exercises}
              isOpen={openId === item.session.id}
              onToggle={() => setOpenId(openId === item.session.id ? null : item.session.id)}
              onRemove={() => {
                if (confirm('Supprimer définitivement cette séance et toutes ses séries ?')) {
                  removeSession(item.session.id)
                }
              }}
            />
          ) : (
            <ActivityCard
              key={item.activity.id}
              a={item.activity}
              onRemove={() => {
                if (confirm('Supprimer cette activité ?')) removeActivity(item.activity.id)
              }}
            />
          ),
        )}
      </div>
    </div>
  )
}

function WeekSummary() {
  const { volume, sessionCount, sportMinutes, loading } = useWeekStats()

  if (loading || (sessionCount === 0 && sportMinutes === 0)) return null

  return (
    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Cette semaine</p>
      <p className="text-sm text-slate-200">
        🏋️ {sessionCount} séance{sessionCount > 1 ? 's' : ''} · {Math.round(volume).toLocaleString('fr-FR')} kg soulevés
        {sportMinutes > 0 && <> · 🏃 {formatMinutes(sportMinutes)} de sport</>}
      </p>
    </div>
  )
}

function ActivityCard({ a, onRemove }: { a: Activity; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="text-sm text-slate-200">
        <span className="mr-1">{sportIcon(a.sport)}</span>
        <span className="font-semibold">{sportLabel(a.sport)}</span>
        <span className="text-slate-500"> · {formatMinutes(a.duration_minutes)}</span>
        {a.distance_km !== null && <span className="text-slate-500"> · {a.distance_km} km</span>}
        <p className="text-xs text-slate-600">{formatDateTime(a.started_at)}</p>
      </div>
      <button type="button" onClick={onRemove} className="px-2 text-slate-600 hover:text-red-400" aria-label="Supprimer">
        🗑️
      </button>
    </div>
  )
}

function SessionCard({
  s,
  gymName,
  exercises,
  isOpen,
  onToggle,
  onRemove,
}: {
  s: WorkoutSession
  gymName: string | undefined
  exercises: { id: string; name: string }[]
  isOpen: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <button type="button" onClick={onToggle} className="flex-1 text-left">
          <span className="text-sm text-slate-200">
            🏋️ {formatDateTime(s.started_at)}
            {gymName ? ` · ${gymName}` : ''}
            {!s.ended_at && <span className="ml-2 text-emerald-400">(en cours)</span>}
            {s.notes && <span className="ml-2 text-xs italic text-slate-500">{s.notes}</span>}
          </span>
        </button>
        <button type="button" onClick={onRemove} className="px-2 text-slate-600 hover:text-red-400" aria-label="Supprimer la séance">
          🗑️
        </button>
        <button type="button" onClick={onToggle} className="px-1 text-slate-500">
          {isOpen ? '▲' : '▼'}
        </button>
      </div>
      {isOpen && <SessionDetail sessionId={s.id} exercises={exercises} />}
    </div>
  )
}

function SessionDetail({
  sessionId,
  exercises,
}: {
  sessionId: string
  exercises: { id: string; name: string }[]
}) {
  const { sets, loading, removeSet, updateSet } = useSessionSets(sessionId)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (loading) return <p className="px-4 pb-3 text-xs text-slate-500">Chargement…</p>
  if (sets.length === 0) return <p className="px-4 pb-3 text-xs text-slate-500">Aucune série.</p>

  const byExercise = new Map<string, SetRow[]>()
  for (const s of sets) {
    const list = byExercise.get(s.exercise_id) ?? []
    list.push(s)
    byExercise.set(s.exercise_id, list)
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-3">
      {Array.from(byExercise.entries()).map(([exId, exSets]) => (
        <div key={exId}>
          <p className="mb-1 text-sm font-semibold text-slate-200">
            {exercises.find((e) => e.id === exId)?.name ?? 'Exercice'}
          </p>
          <ul className="flex flex-col gap-1">
            {exSets.map((s, i) =>
              editingId === s.id ? (
                <EditSetRow
                  key={s.id}
                  set={s}
                  index={i}
                  onSave={async (weightKg, reps) => {
                    await updateSet(s.id, { weightKg, reps })
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <li key={s.id} className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Série {i + 1} — {s.weight_kg} kg × {s.reps}
                    {s.rest_seconds !== null ? ` · repos ${formatSeconds(s.rest_seconds)}` : ''}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(s.id)}
                      className="text-slate-500 hover:text-indigo-400"
                      aria-label="Modifier"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSet(s.id)}
                      className="text-slate-500 hover:text-red-400"
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  )
}

function EditSetRow({
  set,
  index,
  onSave,
  onCancel,
}: {
  set: SetRow
  index: number
  onSave: (weightKg: number, reps: number) => Promise<void>
  onCancel: () => void
}) {
  const [weight, setWeight] = useState(set.weight_kg.toString())
  const [reps, setReps] = useState(set.reps.toString())

  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="text-slate-500">Série {index + 1}</span>
      <input
        type="number"
        step="0.5"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        className="w-16 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
      />
      <span className="text-slate-500">kg ×</span>
      <input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="w-12 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
      />
      <button
        type="button"
        onClick={() => {
          const w = parseFloat(weight)
          const r = parseInt(reps, 10)
          if (!Number.isNaN(w) && !Number.isNaN(r)) onSave(w, r)
        }}
        className="rounded-md bg-indigo-600 px-2 py-1 text-white"
      >
        OK
      </button>
      <button type="button" onClick={onCancel} className="text-slate-500">
        Annuler
      </button>
    </li>
  )
}
