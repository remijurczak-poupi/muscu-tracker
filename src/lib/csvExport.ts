import { supabase } from './supabase'
import type { Activity, Exercise, Gym, SetRow, WorkoutSession } from './types'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export async function buildHistoryCsv(): Promise<string> {
  const [setsRes, sessionsRes, activitiesRes, exercisesRes, gymsRes] = await Promise.all([
    supabase.from('sets').select('*').order('created_at'),
    supabase.from('workout_sessions').select('*'),
    supabase.from('activities').select('*').order('started_at'),
    supabase.from('exercises').select('*'),
    supabase.from('gyms').select('*'),
  ])

  const sets = (setsRes.data ?? []) as SetRow[]
  const sessions = (sessionsRes.data ?? []) as WorkoutSession[]
  const activities = (activitiesRes.data ?? []) as Activity[]
  const exercises = (exercisesRes.data ?? []) as Exercise[]
  const gyms = (gymsRes.data ?? []) as Gym[]

  const exerciseName = new Map(exercises.map((e) => [e.id, e.name]))
  const gymName = new Map(gyms.map((g) => [g.id, g.name]))
  const sessionInfo = new Map(
    sessions.map((s) => [s.id, { gym: s.gym_id ? gymName.get(s.gym_id) ?? '' : '', notes: s.notes ?? '' }]),
  )

  const header = [
    'type',
    'date',
    'exercice_ou_sport',
    'poids_kg',
    'reps',
    'repos_s',
    'duree_min',
    'distance_km',
    'salle',
    'notes',
  ]
  const rows: string[][] = [header]

  for (const s of sets) {
    const info = sessionInfo.get(s.session_id) ?? { gym: '', notes: '' }
    rows.push([
      'muscu',
      s.created_at,
      exerciseName.get(s.exercise_id) ?? '',
      String(s.weight_kg),
      String(s.reps),
      s.rest_seconds !== null ? String(s.rest_seconds) : '',
      '',
      '',
      info.gym,
      info.notes,
    ])
  }

  for (const a of activities) {
    rows.push([
      'sport',
      a.started_at,
      a.sport,
      '',
      '',
      '',
      String(a.duration_minutes),
      a.distance_km !== null ? String(a.distance_km) : '',
      '',
      a.notes ?? '',
    ])
  }

  return rows.map((r) => r.map(csvEscape).join(',')).join('\n')
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
