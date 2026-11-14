export type WarmupSet = { weight: number; reps: number }

const STEPS: { pct: number; reps: number }[] = [
  { pct: 0.4, reps: 8 },
  { pct: 0.6, reps: 5 },
  { pct: 0.8, reps: 3 },
]

/** Propose 2-3 séries d'échauffement progressives avant le poids de travail. */
export function warmupSets(targetWeight: number, increment: number): WarmupSet[] {
  if (targetWeight <= 20) return []
  return STEPS.map((s) => ({
    weight: roundToIncrement(targetWeight * s.pct, increment),
    reps: s.reps,
  })).filter((s, i, arr) => s.weight >= 10 && s.weight < targetWeight && (i === 0 || s.weight > arr[i - 1].weight))
}

function roundToIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment
}
