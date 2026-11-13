import { useState } from 'react'
import { useSessions, useExercises, useGyms } from '../hooks/useData'
import { useSessionSets } from '../hooks/useSessionSets'
import { formatDateTime, formatSeconds } from '../lib/time'

export default function History() {
  const { sessions, loading } = useSessions()
  const { gyms } = useGyms()
  const { exercises } = useExercises()
  const [openId, setOpenId] = useState<string | null>(null)

  if (loading) return <div className="p-6 text-center text-slate-500">Chargement…</div>

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-4 text-lg font-bold text-white">Historique</h1>
      {sessions.length === 0 && (
        <p className="text-sm text-slate-500">Aucune séance enregistrée pour l'instant.</p>
      )}
      <div className="flex flex-col gap-2">
        {sessions.map((s) => {
          const gym = gyms.find((g) => g.id === s.gym_id)
          const isOpen = openId === s.id
          return (
            <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : s.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm text-slate-200">
                  {formatDateTime(s.started_at)}
                  {gym ? ` · ${gym.name}` : ''}
                  {!s.ended_at && <span className="ml-2 text-emerald-400">(en cours)</span>}
                  {s.notes && <span className="ml-2 text-xs italic text-slate-500">{s.notes}</span>}
                </span>
                <span className="text-slate-500">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && <SessionDetail sessionId={s.id} exercises={exercises} />}
            </div>
          )
        })}
      </div>
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
  const { sets, loading } = useSessionSets(sessionId)
  if (loading) return <p className="px-4 pb-3 text-xs text-slate-500">Chargement…</p>
  if (sets.length === 0) return <p className="px-4 pb-3 text-xs text-slate-500">Aucune série.</p>

  const byExercise = new Map<string, typeof sets>()
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
          <ul className="flex flex-col gap-0.5 text-xs text-slate-400">
            {exSets.map((s, i) => (
              <li key={s.id}>
                Série {i + 1} — {s.weight_kg} kg × {s.reps}
                {s.rest_seconds !== null ? ` · repos ${formatSeconds(s.rest_seconds)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
