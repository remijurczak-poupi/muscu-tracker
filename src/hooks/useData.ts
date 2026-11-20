import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { queueInsert, getPendingInserts, cacheGet, cacheSet, onOutboxChange } from '../lib/offline'
import type {
  Activity,
  BodyMetric,
  Exercise,
  ExerciseGymLink,
  Gym,
  SessionTemplate,
  SetRow,
  WorkoutSession,
} from '../lib/types'

export function useGyms() {
  const { session: authSession } = useAuth()
  const [gyms, setGyms] = useState<Gym[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    let fromDb: Gym[] | null = null
    let lastUsed = new Map<string, string>()
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
        fromDb = gymsRes.data as Gym[]
        cacheSet('gyms', fromDb)
        for (const s of (sessionsRes.data ?? []) as { gym_id: string; started_at: string }[]) {
          if (!lastUsed.has(s.gym_id)) lastUsed.set(s.gym_id, s.started_at)
        }
        cacheSet('gyms-last-used', Array.from(lastUsed.entries()))
      }
    } catch {
      // hors-ligne : on repart du cache
    } finally {
      setLoading(false)
    }
    const base = fromDb ?? cacheGet<Gym[]>('gyms') ?? []
    if (lastUsed.size === 0) {
      const cachedLastUsed = cacheGet<[string, string][]>('gyms-last-used')
      if (cachedLastUsed) lastUsed = new Map(cachedLastUsed)
    }
    const pending = getPendingInserts<Gym>('gyms')
    const merged = [...base, ...pending.filter((p) => !base.some((b) => b.id === p.id))]
    const sorted = merged.sort((a, b) => {
      const ta = lastUsed.get(a.id)
      const tb = lastUsed.get(b.id)
      if (ta && tb) return new Date(tb).getTime() - new Date(ta).getTime()
      if (ta) return -1
      if (tb) return 1
      return a.name.localeCompare(b.name)
    })
    setGyms(sorted)
  }, [])

  useEffect(() => {
    refresh()
    return onOutboxChange(refresh)
  }, [refresh])

  const addGym = async (name: string) => {
    const userId = authSession?.user.id
    if (!userId) return
    const row: Gym = { id: crypto.randomUUID(), user_id: userId, name, created_at: new Date().toISOString() }
    setGyms((prev) => [row, ...prev])
    void (async () => {
      try {
        const { error } = await supabase.from('gyms').insert(row)
        if (error) throw error
      } catch {
        queueInsert('gyms', row)
      }
    })()
  }

  const removeGym = async (id: string) => {
    await supabase.from('gyms').delete().eq('id', id)
    await refresh()
  }

  return { gyms, loading, addGym, removeGym, refresh }
}

export function useExercises() {
  const { session: authSession } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    let fromDb: Exercise[] | null = null
    try {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      if (!error && data) {
        fromDb = data as Exercise[]
        cacheSet('exercises', fromDb)
      }
    } catch {
      // hors-ligne : on repart du cache
    } finally {
      setLoading(false)
    }
    const base = fromDb ?? cacheGet<Exercise[]>('exercises') ?? []
    const pending = getPendingInserts<Exercise>('exercises')
    const merged = [...base, ...pending.filter((p) => !base.some((b) => b.id === p.id))].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    setExercises(merged)
  }, [])

  useEffect(() => {
    refresh()
    return onOutboxChange(refresh)
  }, [refresh])

  const addExercise = async (name: string, muscleGroup: string | null, gymId?: string | null) => {
    const userId = authSession?.user.id
    if (!userId) return null
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      muscle_group: muscleGroup,
      weight_increment: 2.5,
      created_at: new Date().toISOString(),
    }
    // Optimiste et non bloquant : utilisable (sélectionnable, liable à la salle) tout de suite.
    setExercises((prev) => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name)))
    void (async () => {
      try {
        const { error } = await supabase.from('exercises').insert(exercise)
        if (error) throw error
      } catch {
        queueInsert('exercises', exercise)
      }
    })()
    if (gymId) {
      const link: ExerciseGymLink = {
        exercise_id: exercise.id,
        gym_id: gymId,
        user_id: userId,
        created_at: new Date().toISOString(),
      }
      void (async () => {
        try {
          const { error } = await supabase.from('exercise_gyms').insert(link)
          if (error) throw error
        } catch {
          queueInsert('exercise_gyms', link as unknown as Record<string, unknown>)
        }
      })()
    }
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
  const { session: authSession } = useAuth()
  const [exerciseIds, setExerciseIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!gymId) {
      setExerciseIds(new Set())
      setLoading(false)
      return
    }
    let fromDb: string[] | null = null
    try {
      const { data, error } = await supabase.from('exercise_gyms').select('exercise_id').eq('gym_id', gymId)
      if (!error && data) {
        fromDb = (data as { exercise_id: string }[]).map((r) => r.exercise_id)
        cacheSet(`exercise-gyms:${gymId}`, fromDb)
      }
    } catch {
      // hors-ligne : on repart du cache
    } finally {
      setLoading(false)
    }
    const base = fromDb ?? cacheGet<string[]>(`exercise-gyms:${gymId}`) ?? []
    const pending = getPendingInserts<ExerciseGymLink>('exercise_gyms')
      .filter((l) => l.gym_id === gymId)
      .map((l) => l.exercise_id)
    setExerciseIds(new Set([...base, ...pending]))
  }, [gymId])

  useEffect(() => {
    refresh()
    return onOutboxChange(refresh)
  }, [refresh])

  const linkExercise = async (exerciseId: string) => {
    if (!gymId) return
    const userId = authSession?.user.id
    if (!userId) return
    setExerciseIds((prev) => new Set(prev).add(exerciseId))
    const link: ExerciseGymLink = { exercise_id: exerciseId, gym_id: gymId, user_id: userId, created_at: new Date().toISOString() }
    void (async () => {
      try {
        const { error } = await supabase
          .from('exercise_gyms')
          .upsert(link, { onConflict: 'exercise_id,gym_id', ignoreDuplicates: true })
        if (error) throw error
      } catch {
        queueInsert('exercise_gyms', link as unknown as Record<string, unknown>)
      }
    })()
  }

  return { exerciseIds, loading, linkExercise, refresh }
}

export function useActivities(limit = 30) {
  const { session: authSession } = useAuth()
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
    durationSeconds: number
    distanceKm: number | null
  }) => {
    const userId = authSession?.user.id
    if (!userId) return
    await supabase.from('activities').insert({
      user_id: userId,
      sport: params.sport,
      started_at: params.startedAt,
      duration_seconds: params.durationSeconds,
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
  const { session: authSession } = useAuth()
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
    const userId = authSession?.user.id
    if (!userId) return
    await supabase.from('session_templates').insert({ name, exercise_ids: exerciseIds, user_id: userId })
    await refresh()
  }

  const removeTemplate = async (id: string) => {
    await supabase.from('session_templates').delete().eq('id', id)
    await refresh()
  }

  return { templates, loading, addTemplate, removeTemplate, refresh }
}

export function useBodyMetrics() {
  const { session: authSession } = useAuth()
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
    const userId = authSession?.user.id
    if (!userId) return
    const { data } = await supabase
      .from('body_metrics')
      .insert({ date, weight_kg: weightKg, user_id: userId })
      .select()
      .single()
    const metric = data as BodyMetric | null
    if (metric && photo) {
      const path = `${userId}/body/${metric.id}`
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
  const [sportSeconds, setSportSeconds] = useState(0)
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
          supabase.from('activities').select('duration_seconds').gte('started_at', since),
        ])
        if (setsRes.data) {
          const rows = setsRes.data as { session_id: string; weight_kg: number; reps: number }[]
          setVolume(rows.reduce((sum, s) => sum + s.weight_kg * s.reps, 0))
          setSessionCount(new Set(rows.map((s) => s.session_id)).size)
        }
        if (activitiesRes.data) {
          const rows = activitiesRes.data as { duration_seconds: number }[]
          setSportSeconds(rows.reduce((sum, a) => sum + a.duration_seconds, 0))
        }
      } catch {
        // réseau indisponible
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { volume, sessionCount, sportSeconds, loading }
}
