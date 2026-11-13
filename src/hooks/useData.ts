import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Activity, Exercise, Gym, SetRow, WorkoutSession } from '../lib/types'

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

  return { sessions, loading, refresh }
}
