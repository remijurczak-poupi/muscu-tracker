import type { Exercise, SetRow } from './types'

export type Suggestion = {
  weight: number
  reps: number
  message: string
  daysSinceLast: number | null
}

/**
 * Heuristique de suggestion de charge :
 * - Jamais fait : pas de suggestion.
 * - Fait récemment (< 10 jours) et tous les sets de la dernière séance ont
 *   atteint/dépassé le nombre de reps max observé sur cette séance : on
 *   propose une petite progression (+1 incrément).
 * - Fait récemment sans avoir rempli les reps : on reste sur le même poids.
 * - Pause de 10 à 21 jours : même poids que la dernière fois (prudence).
 * - Pause > 21 jours : on redescend le poids (~10%, arrondi à l'incrément)
 *   pour compenser la perte d'habituation, en expliquant pourquoi.
 */
export function suggestNextWeight(exercise: Exercise, history: SetRow[]): Suggestion | null {
  if (history.length === 0) return null

  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const lastDate = new Date(sorted[0].created_at)
  const lastSessionId = sorted[0].session_id
  const lastSets = sorted.filter((s) => s.session_id === lastSessionId)

  const topWeight = Math.max(...lastSets.map((s) => s.weight_kg))
  const topSets = lastSets.filter((s) => s.weight_kg === topWeight)
  const bestReps = Math.max(...topSets.map((s) => s.reps))
  const targetRepsHit = topSets.every((s) => s.reps >= bestReps)

  const daysSinceLast = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  const increment = exercise.weight_increment || 2.5

  if (daysSinceLast > 21) {
    const reduced = roundToIncrement(topWeight * 0.9, increment)
    return {
      weight: reduced,
      reps: bestReps,
      daysSinceLast,
      message: `Ça fait ${daysSinceLast} jours (dernière fois : ${topWeight} kg × ${bestReps}). On repart un peu plus léger pour se réhabituer.`,
    }
  }

  if (daysSinceLast >= 10) {
    return {
      weight: topWeight,
      reps: bestReps,
      daysSinceLast,
      message: `Ça fait ${daysSinceLast} jours. Reprends au même poids que la dernière fois (${topWeight} kg × ${bestReps}).`,
    }
  }

  if (targetRepsHit) {
    const increased = roundToIncrement(topWeight + increment, increment)
    return {
      weight: increased,
      reps: bestReps,
      daysSinceLast,
      message: `La dernière fois tu as fait ${topWeight} kg × ${bestReps} sur toutes les séries. Essaie ${increased} kg.`,
    }
  }

  return {
    weight: topWeight,
    reps: bestReps,
    daysSinceLast,
    message: `La dernière fois : ${topWeight} kg × ${bestReps}. Reste sur ce poids et vise plus de reps.`,
  }
}

function roundToIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment
}
