import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Activity, BodyMetric, Exercise, Gym, SessionTemplate, SetRow, WorkoutSession } from '../lib/types'

export function useGyms() {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [gymsRes, sessionsRes] = await Promise.all([
        supabase.from('gyms').select('*'),
        supabase
          .from('workout_sessions')
          .select('gym_id, started_at')
          .not('gym_id', 'is', null)
          .order('started_at', { ascending: false }),
      ])
      if (!gymsRes.error && gymsRes.data) {
        const lastUsed = new Map<string, string>()
        for (const s of (sessionsRes.data ?? []) as { gym_id: string; started_at: string }[]) {
          if (!lastUsed.has(s.gym_id)) lastUsed.set(s.gym_id, s.started_at)
        }
        const sorted = [...(gymsRes.data as Gym[])].sort((a, b) => {
          const ta = lastUsed.get(a.id)
          const tb = lastUsed.get(b.id)
          if (ta && tb) return new Date(tb).getTime() - new Date(ta).getTime()
          if (ta) return -1
          if (tb) return 1
          return a.name.localeCompare(b.name)
        })
        setGyms(sorted)
      }
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addGym = async (name: string) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase.from('gyms').insert({ name, user_id: userData.user.id })
    await refresh()
  }

  const removeGym = async (id: string) => {
    await supabase.from('gyms').delete().eq('id', id)
    await refresh()
  }

  return { gyms, loading, addGym, removeGym, refresh }
}

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      if (!error && data) setExercises(data as Exercise[])
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addExercise = async (name: string, muscleGroup: string | null, gymId?: string | null) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return null
    const { data } = await supabase
      .from('exercises')
      .insert({ name, muscle_group: muscleGroup, user_id: userData.user.id })
      .select()
      .single()
    const exercise = (data as Exercise) ?? null
    if (exercise && gymId) {
      await supabase
        .from('exercise_gyms')
        .insert({ exercise_id: exercise.id, gym_id: gymId, user_id: userData.user.id })
    }
    await refresh()
    return exercise
  }

  const removeExercise = async (id: string) => {
    await supabase.from('exercises').delete().eq('id', id)
    await refresh()
  }

  const updateExerciseMuscleGroup = async (id: string, muscleGroup: string | null) => {
    await supabase.from('exercises').update({ muscle_group: muscleGroup }).eq('id', id)
    await refresh()
  }

  return { exercises, loading, addExercise, removeExercise, updateExerciseMuscleGroup, refresh }
}

/** gymId filtre l'historique à une seule salle (poids/suggestions dépendent de l'équipement de la salle). */
export function useExerciseHistory(exerciseId: string | null, gymId?: string | null) {
  const [history, setHistory] = useState<SetRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!exerciseId) {
      setHistory([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let query = supabase
        .from('sets')
        .select('*, workout_sessions!inner(gym_id)')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
      if (gymId) query = query.eq('workout_sessions.gym_id', gymId)
      const { data, error } = await query
      if (!error && data) setHistory(data as SetRow[])
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [exerciseId, gymId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { history, loading, refresh }
}

/** Exercices liés à une salle donnée (visibles dans le picker quand on est dans cette salle). */
export function useExerciseGymLinks(gymId: string | null) {
  const [exerciseIds, setExerciseIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!gymId) {
      setExerciseIds(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('exercise_gyms').select('exercise_id').eq('gym_id', gymId)
      if (!error && data) setExerciseIds(new Set((data as { exercise_id: string }[]).map((r) => r.exercise_id)))
    } catch {
      // réseau indisponible
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const linkExercise = async (exerciseId: string) => {
    if (!gymId) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase
      .from('exercise_gyms')
      .upsert(
        { exercise_id: exerciseId, gym_id: gymId, user_id: userData.user.id },
        { onConflict: 'exercise_id,gym_id', ignoreDuplicates: true },
      )
    await refresh()
  }

  return { exerciseIds, loading, linkExercise, refresh }
}

export function useActivities(limit = 30) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (!error && data) setActivities(data as Activity[])
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addActivity = async (params: {
    sport: string
    startedAt: string
    durationMinutes: number
    distanceKm: number | null
  }) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase.from('activities').insert({
      user_id: userData.user.id,
      sport: params.sport,
      started_at: params.startedAt,
      duration_minutes: params.durationMinutes,
      distance_km: params.distanceKm,
    })
    await refresh()
  }

  const removeActivity = async (id: string) => {
    await supabase.from('activities').delete().eq('id', id)
    await refresh()
  }

  return { activities, loading, addActivity, removeActivity, refresh }
}

export function useSessions(limit = 30) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (!error && data) setSessions(data as WorkoutSession[])
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  const removeSession = async (id: string) => {
    await supabase.from('workout_sessions').delete().eq('id', id)
    await refresh()
  }

  return { sessions, loading, removeSession, refresh }
}

export function useTemplates() {
  const [templates, setTemplates] = useState<SessionTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('session_templates')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setTemplates(data as SessionTemplate[])
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addTemplate = async (name: string, exerciseIds: string[]) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase
      .from('session_templates')
      .insert({ name, exercise_ids: exerciseIds, user_id: userData.user.id })
    await refresh()
  }

  const removeTemplate = async (id: string) => {
    await supabase.from('session_templates').delete().eq('id', id)
    await refresh()
  }

  return { templates, loading, addTemplate, removeTemplate, refresh }
}

export function useBodyMetrics() {
  const [metrics, setMetrics] = useState<BodyMetric[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(60)
      if (!error && data) setMetrics(data as BodyMetric[])
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addMetric = async (date: string, weightKg: number, photo?: File | null) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { data } = await supabase
      .from('body_metrics')
      .insert({ date, weight_kg: weightKg, user_id: userData.user.id })
      .select()
      .single()
    const metric = data as BodyMetric | null
    if (metric && photo) {
      const path = `${userData.user.id}/body/${metric.id}`
      const { error: uploadError } = await supabase.storage
        .from('exercise-photos')
        .upload(path, photo, { upsert: true, contentType: photo.type })
      if (!uploadError) {
        await supabase.from('body_metrics').update({ photo_path: path }).eq('id', metric.id)
      }
    }
    await refresh()
  }

  const removeMetric = async (id: string) => {
    await supabase.from('body_metrics').delete().eq('id', id)
    await refresh()
  }

  const metricPhotoUrl = (metric: BodyMetric) =>
    metric.photo_path ? supabase.storage.from('exercise-photos').getPublicUrl(metric.photo_path).data.publicUrl : null

  return { metrics, loading, addMetric, removeMetric, metricPhotoUrl, refresh }
}

export function useWeekStats() {
  const [volume, setVolume] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [sportMinutes, setSportMinutes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const dayIndex = (now.getDay() + 6) % 7 // lundi = 0
    const monday = new Date(now)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(now.getDate() - dayIndex)
    const since = monday.toISOString()

    const run = async () => {
      try {
        const [setsRes, activitiesRes] = await Promise.all([
          supabase.from('sets').select('session_id, weight_kg, reps').gte('created_at', since),
          supabase.from('activities').select('duration_minutes').gte('started_at', since),
        ])
        if (setsRes.data) {
          const rows = setsRes.data as { session_id: string; weight_kg: number; reps: number }[]
          setVolume(rows.reduce((sum, s) => sum + s.weight_kg * s.reps, 0))
          setSessionCount(new Set(rows.map((s) => s.session_id)).size)
        }
        if (activitiesRes.data) {
          const rows = activitiesRes.data as { duration_minutes: number }[]
          setSportMinutes(rows.reduce((sum, a) => sum + a.duration_minutes, 0))
        }
      } catch {
        // réseau indisponible
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { volume, sessionCount, sportMinutes, loading }
}
