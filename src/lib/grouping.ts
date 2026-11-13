import type { Exercise } from './types'

const GROUP_ORDER = ['Dos', 'Pec', 'Biceps', 'Triceps', 'Epaules', 'Jambes', 'Avant bras']

/** Regroupe et trie les exercices par muscle_group (ordre anatomique fixe, puis alpha, sans catégorie en dernier). */
export function groupByMuscle(exercises: Exercise[]): [string, Exercise[]][] {
  const map = new Map<string, Exercise[]>()
  for (const e of exercises) {
    const key = e.muscle_group ?? 'Sans catégorie'
    const list = map.get(key) ?? []
    list.push(e)
    map.set(key, list)
  }
  for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name))

  return Array.from(map.entries()).sort(([a], [b]) => {
    if (a === 'Sans catégorie') return 1
    if (b === 'Sans catégorie') return -1
    const ia = GROUP_ORDER.indexOf(a)
    const ib = GROUP_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}
