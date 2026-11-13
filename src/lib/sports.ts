export type SportDef = {
  key: string
  label: string
  icon: string
  hasDistance: boolean
}

export const SPORTS: SportDef[] = [
  { key: 'course', label: 'Course', icon: '🏃', hasDistance: true },
  { key: 'padel', label: 'Padel', icon: '🏓', hasDistance: false },
  { key: 'badminton', label: 'Badminton', icon: '🏸', hasDistance: false },
  { key: 'foot', label: 'Foot', icon: '⚽', hasDistance: false },
  { key: 'tennis', label: 'Tennis', icon: '🎾', hasDistance: false },
  { key: 'squash', label: 'Squash', icon: '🥎', hasDistance: false },
]

export function sportIcon(sport: string): string {
  return SPORTS.find((s) => s.key === sport)?.icon ?? '🏅'
}

export function sportLabel(sport: string): string {
  return SPORTS.find((s) => s.key === sport)?.label ?? sport
}
