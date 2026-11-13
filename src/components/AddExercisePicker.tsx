import { useState } from 'react'
import type { Exercise } from '../lib/types'

type Props = {
  exercises: Exercise[]
  excludeIds: string[]
  onPick: (exerciseId: string) => void
  onCreate: (name: string) => Promise<Exercise | null>
}

export default function AddExercisePicker({ exercises, excludeIds, onPick, onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const available = exercises.filter(
    (e) => !excludeIds.includes(e.id) && e.name.toLowerCase().includes(query.toLowerCase()),
  )
  const exactMatch = exercises.some((e) => e.name.toLowerCase() === query.trim().toLowerCase())

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-slate-700 py-3 text-sm font-medium text-slate-400"
      >
        + Ajouter un exercice
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher ou créer un exercice..."
        className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500"
      />
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {available.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              onPick(e.id)
              setOpen(false)
              setQuery('')
            }}
            className="rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
          >
            {e.name}
          </button>
        ))}
        {query.trim() && !exactMatch && (
          <button
            type="button"
            onClick={async () => {
              const created = await onCreate(query.trim())
              if (created) onPick(created.id)
              setOpen(false)
              setQuery('')
            }}
            className="rounded-md px-3 py-2 text-left text-sm text-indigo-400 hover:bg-slate-800"
          >
            + Créer "{query.trim()}"
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 text-xs text-slate-500 underline"
      >
        Annuler
      </button>
    </div>
  )
}
