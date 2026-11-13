import { useState } from 'react'
import { useActivities } from '../hooks/useData'
import { SPORTS, sportIcon, sportLabel } from '../lib/sports'
import { formatDateTime } from '../lib/time'

export default function Activities() {
  const { activities, loading, addActivity, removeActivity } = useActivities()
  const [sport, setSport] = useState(SPORTS[0].key)
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [date, setDate] = useState(() => toLocalInputValue(new Date()))
  const [saving, setSaving] = useState(false)

  const def = SPORTS.find((s) => s.key === sport) ?? SPORTS[0]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const d = parseInt(duration, 10)
    if (Number.isNaN(d) || d <= 0) return
    const km = def.hasDistance && distance ? parseFloat(distance) : null
    setSaving(true)
    try {
      await addActivity({
        sport,
        startedAt: new Date(date).toISOString(),
        durationMinutes: d,
        distanceKm: km,
      })
      setDuration('')
      setDistance('')
      setDate(toLocalInputValue(new Date()))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-4 text-lg font-bold text-white">Autres sports</h1>

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
            Durée (min)
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
              required
            />
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

      {loading && <p className="text-sm text-slate-500">Chargement…</p>}
      {!loading && activities.length === 0 && (
        <p className="text-sm text-slate-500">Aucune activité enregistrée pour l'instant.</p>
      )}

      <div className="flex flex-col gap-2">
        {activities.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3"
          >
            <div className="text-sm text-slate-200">
              <span className="mr-1">{sportIcon(a.sport)}</span>
              <span className="font-semibold">{sportLabel(a.sport)}</span>
              <span className="text-slate-500"> · {a.duration_minutes} min</span>
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
    </div>
  )
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
