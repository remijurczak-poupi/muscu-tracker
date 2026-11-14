import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Activity, BodyMetric, Exercise, Gym, SessionTemplate, SetRow, WorkoutSession } from '../lib/types'

export function useGyms() {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('gyms').select('*').order('name')
      if (!error && data) setGyms(data as Gym[])
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

  const addExercise = async (name: string, muscleGroup: string | null) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return null
    const { data } = await supabase
      .from('exercises')
      .insert({ name, muscle_group: muscleGroup, user_id: userData.user.id })
      .select()
      .single()
    await refresh()
    return (data as Exercise) ?? null
  }

  const removeExercise = async (id: string) => {
    await supabase.from('exercises').delete().eq('id', id)
    await refresh()
  }

  return { exercises, loading, addExercise, removeExercise, refresh }
}

export function useExerciseHistory(exerciseId: string | null) {
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
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
      if (!error && data) setHistory(data as SetRow[])
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [exerciseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { history, loading, refresh }
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

  const addMetric = async (date: string, weightKg: number) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase.from('body_metrics').insert({ date, weight_kg: weightKg, user_id: userData.user.id })
    await refresh()
  }

  const removeMetric = async (id: string) => {
    await supabase.from('body_metrics').delete().eq('id', id)
    await refresh()
  }

  return { metrics, loading, addMetric, removeMetric, refresh }
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
