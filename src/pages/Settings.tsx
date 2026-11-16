import { useState } from 'react'
import { useGyms, useExercises, useTemplates, useBodyMetrics } from '../hooks/useData'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { buildHistoryCsv, downloadCsv } from '../lib/csvExport'
import { MUSCLE_GROUPS } from '../lib/grouping'

export default function Settings() {
  const { gyms, addGym, removeGym } = useGyms()
  const { exercises, removeExercise, updateExerciseMuscleGroup } = useExercises()
  const { templates, removeTemplate } = useTemplates()
  const { metrics, addMetric, removeMetric, metricPhotoUrl } = useBodyMetrics()
  const { session } = useAuth()
  const [newGym, setNewGym] = useState('')
  const [metricDate, setMetricDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [metricWeight, setMetricWeight] = useState('')
  const [metricPhoto, setMetricPhoto] = useState<File | null>(null)
  const [savingMetric, setSavingMetric] = useState(false)
  const [exporting, setExporting] = useState(false)

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
              className="flex items-center justify-between gap-2 rounded-md bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
            >
              <span className="flex-1 truncate">{e.name}</span>
              <select
                value={e.muscle_group ?? 'Sans catégorie'}
                onChange={(ev) => {
                  const v = ev.target.value
                  updateExerciseMuscleGroup(e.id, v === 'Sans catégorie' ? null : v)
                }}
                className="rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 text-xs text-slate-300"
              >
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
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

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Templates de séance</h2>
        {templates.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aucun template — enregistre la sélection d'exercices d'une séance en cours depuis l'onglet Séance.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-md bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
              >
                {t.name} <span className="text-xs text-slate-500">({t.exercise_ids.length} exos)</span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Supprimer le template "${t.name}" ?`)) removeTemplate(t.id)
                  }}
                  className="text-slate-500 hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Poids de corps</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const w = parseFloat(metricWeight)
            if (Number.isNaN(w)) return
            setSavingMetric(true)
            try {
              await addMetric(metricDate, w, metricPhoto)
              setMetricWeight('')
              setMetricPhoto(null)
            } finally {
              setSavingMetric(false)
            }
          }}
          className="mb-2 flex flex-wrap items-end gap-2"
        >
          <label className="flex flex-col text-xs text-slate-400">
            Date
            <input
              type="date"
              value={metricDate}
              onChange={(e) => setMetricDate(e.target.value)}
              className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-400">
            Poids (kg)
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={metricWeight}
              onChange={(e) => setMetricWeight(e.target.value)}
              className="mt-1 w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-white"
              required
            />
          </label>
          <label className="flex flex-col text-xs text-slate-400">
            Photo (optionnel)
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => setMetricPhoto(e.target.files?.[0] ?? null)}
              className="mt-1 w-40 text-xs text-slate-400"
            />
          </label>
          <button
            type="submit"
            disabled={savingMetric}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingMetric ? '…' : 'Ajouter'}
          </button>
        </form>
        {metrics.length > 0 && (
          <ul className="flex flex-col gap-1">
            {metrics.slice(0, 8).map((m) => {
              const photoUrl = metricPhotoUrl(m)
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
                >
                  <span className="flex items-center gap-2">
                    {photoUrl && (
                      <img src={photoUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
                    )}
                    {new Date(m.date).toLocaleDateString('fr-FR')} · {m.weight_kg} kg
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMetric(m.id)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Export</h2>
        <button
          type="button"
          disabled={exporting}
          onClick={async () => {
            setExporting(true)
            try {
              const csv = await buildHistoryCsv()
              downloadCsv(`muscu-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`, csv)
            } finally {
              setExporting(false)
            }
          }}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {exporting ? 'Génération…' : 'Exporter mes données (CSV)'}
        </button>
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
