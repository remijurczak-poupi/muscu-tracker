import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useExercises, useExerciseHistory, useGyms, useExerciseGymLinks } from '../hooks/useData'
import { suggestNextWeight } from '../lib/suggestions'
import { formatDate } from '../lib/time'
import { groupByMuscle } from '../lib/grouping'

export default function Exercises() {
  const { exercises, loading } = useExercises()
  const { gyms, loading: gymsLoading } = useGyms()
  const [selected, setSelected] = useState<string | null>(null)
  const [gymId, setGymId] = useState<string | null>(null)

  useEffect(() => {
    if (!gymsLoading && gymId === null && gyms.length > 0) setGymId(gyms[0].id)
  }, [gymsLoading, gyms, gymId])

  const { exerciseIds: linkedExerciseIds } = useExerciseGymLinks(gymId)

  if (loading || gymsLoading) return <div className="p-6 text-center text-slate-500">Chargement…</div>

  const exercise = exercises.find((e) => e.id === selected)
  const visibleExercises = gymId ? exercises.filter((e) => linkedExerciseIds.has(e.id)) : exercises
  const groups = groupByMuscle(visibleExercises)

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-4 text-lg font-bold text-white">Exercices</h1>

      {gyms.length > 0 && (
        <select
          value={gymId ?? ''}
          onChange={(e) => {
            setGymId(e.target.value || null)
            setSelected(null)
          }}
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        >
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          <option value="">Toutes les salles</option>
        </select>
      )}

      {!exercise && (
        <div className="flex flex-col gap-4">
          {visibleExercises.length === 0 && (
            <p className="text-sm text-slate-500">
              Aucun exercice encore lié à cette salle — ajoute-en depuis l'onglet Séance.
            </p>
          )}
          {groups.map(([group, list]) => (
            <div key={group}>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group}
              </h2>
              <div className="flex flex-col gap-1.5">
                {list.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelected(e.id)}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-200"
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {exercise && (
        <ExerciseDetail
          exerciseId={exercise.id}
          name={exercise.name}
          gymId={gymId}
          onBack={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function ExerciseDetail({
  exerciseId,
  name,
  gymId,
  onBack,
}: {
  exerciseId: string
  name: string
  gymId: string | null
  onBack: () => void
}) {
  const { exercises } = useExercises()
  const { history, loading } = useExerciseHistory(exerciseId, gymId)
  const exercise = exercises.find((e) => e.id === exerciseId)

  const chartData = [...history]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .reduce<{ date: string; weight: number; ts: number }[]>((acc, s) => {
      const ts = new Date(s.created_at).setHours(0, 0, 0, 0)
      const existing = acc.find((d) => d.ts === ts)
      if (existing) existing.weight = Math.max(existing.weight, s.weight_kg)
      else acc.push({ date: formatDate(s.created_at), weight: s.weight_kg, ts })
      return acc
    }, [])

  const suggestion = exercise ? suggestNextWeight(exercise, history) : null

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 text-sm text-slate-400 underline">
        ← Retour
      </button>
      <h2 className="mb-3 text-base font-semibold text-white">{name}</h2>

      {loading && <p className="text-sm text-slate-500">Chargement…</p>}

      {!loading && chartData.length === 0 && (
        <p className="text-sm text-slate-500">Pas encore de séries enregistrées.</p>
      )}

      {!loading && chartData.length > 0 && (
        <div className="mb-4 h-56 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Line type="monotone" dataKey="weight" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {suggestion && (
        <div className="rounded-lg bg-indigo-500/10 px-3 py-2 text-sm text-indigo-300">
          💡 Si tu le fais aujourd'hui : {suggestion.message}
        </div>
      )}
    </div>
  )
}
