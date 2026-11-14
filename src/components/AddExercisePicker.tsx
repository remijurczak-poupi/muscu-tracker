import { useState } from 'react'
import type { Exercise } from '../lib/types'
import { groupByMuscle } from '../lib/grouping'

type Props = {
  exercises: Exercise[]
  excludeIds: string[]
  gymId: string | null
  linkedExerciseIds: Set<string>
  onPick: (exerciseId: string) => void
  onCreate: (name: string, muscleGroup: string | null) => Promise<Exercise | null>
  onLinkExisting: (exerciseId: string) => Promise<void>
}

const GROUP_ICONS: Record<string, string> = {
  Dos: '🔙',
  Pec: '🫁',
  Biceps: '💪',
  Triceps: '💪',
  Epaules: '🤷',
  Jambes: '🦵',
  'Avant bras': '✊',
  'Sans catégorie': '❔',
}

export default function AddExercisePicker({
  exercises,
  excludeIds,
  gymId,
  linkedExerciseIds,
  onPick,
  onCreate,
  onLinkExisting,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const gymFilterActive = gymId !== null
  const excludable = exercises.filter((e) => !excludeIds.includes(e.id))
  const scoped = gymFilterActive ? excludable.filter((e) => linkedExerciseIds.has(e.id)) : excludable
  const allGroups = groupByMuscle(scoped)

  const searching = query.trim().length > 0
  const showGroupList = !searching && selectedGroup === null

  const visible = (searching ? excludable : scoped).filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) &&
      (searching || selectedGroup === null || (e.muscle_group ?? 'Sans catégorie') === selectedGroup),
  )
  const exactMatch = exercises.some((e) => e.name.toLowerCase() === query.trim().toLowerCase())

  const close = () => {
    setOpen(false)
    setQuery('')
    setSelectedGroup(null)
  }

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

      {showGroupList ? (
        allGroups.length === 0 ? (
          <p className="px-1 py-2 text-xs text-slate-500">
            Aucun exercice encore lié à cette salle — cherche-en un existant ou crée-en un nouveau.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {allGroups.map(([group, list]) => (
              <button
                key={group}
                type="button"
                onClick={() => setSelectedGroup(group)}
                className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-3 text-left text-sm text-slate-200 hover:bg-slate-700"
              >
                <span>
                  {GROUP_ICONS[group] ?? '🏷️'} {group}
                </span>
                <span className="text-xs text-slate-500">{list.length}</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {!searching && selectedGroup && (
            <button
              type="button"
              onClick={() => setSelectedGroup(null)}
              className="mb-1 self-start text-xs text-slate-500 underline"
            >
              ← Tous les groupes
            </button>
          )}
          {visible.map((e) => {
            const alreadyLinked = !gymFilterActive || linkedExerciseIds.has(e.id)
            return (
              <button
                key={e.id}
                type="button"
                onClick={async () => {
                  if (!alreadyLinked) await onLinkExisting(e.id)
                  onPick(e.id)
                  close()
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                {e.name}
                {searching && e.muscle_group && (
                  <span className="ml-2 text-xs text-slate-500">{e.muscle_group}</span>
                )}
                {!alreadyLinked && <span className="ml-2 text-xs text-amber-400">+ lier à cette salle</span>}
              </button>
            )
          })}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={async () => {
                const group = selectedGroup === 'Sans catégorie' ? null : selectedGroup
                const created = await onCreate(query.trim(), group)
                if (created) onPick(created.id)
                close()
              }}
              className="rounded-md px-3 py-2 text-left text-sm text-indigo-400 hover:bg-slate-800"
            >
              + Créer "{query.trim()}"{selectedGroup ? ` (${selectedGroup})` : ''}
            </button>
          )}
        </div>
      )}

      <button type="button" onClick={close} className="mt-2 text-xs text-slate-500 underline">
        Annuler
      </button>
    </div>
  )
}
