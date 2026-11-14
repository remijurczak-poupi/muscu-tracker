export type Gym = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type Exercise = {
  id: string
  user_id: string
  name: string
  muscle_group: string | null
  weight_increment: number
  created_at: string
}

export type WorkoutSession = {
  id: string
  user_id: string
  gym_id: string | null
  started_at: string
  ended_at: string | null
  notes: string | null
}

export type SetRow = {
  id: string
  user_id: string
  session_id: string
  exercise_id: string
  set_index: number
  weight_kg: number
  reps: number
  rest_seconds: number | null
  created_at: string
}

export type Activity = {
  id: string
  user_id: string
  sport: string
  started_at: string
  duration_minutes: number
  distance_km: number | null
  notes: string | null
}

export type SessionTemplate = {
  id: string
  user_id: string
  name: string
  exercise_ids: string[]
  created_at: string
}

export type BodyMetric = {
  id: string
  user_id: string
  date: string
  weight_kg: number
  created_at: string
}

export type ExerciseGymNote = {
  id: string
  user_id: string
  exercise_id: string
  gym_id: string
  photo_path: string | null
  technique_notes: string | null
  video_url: string | null
  updated_at: string
}
