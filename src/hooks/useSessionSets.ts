import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SetRow } from '../lib/types'

export function useSessionSets(sessionId: string | null) {
  const [sets, setSets] = useState<SetRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setSets([])
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      if (!error && data) setSets(data as SetRow[])
    } catch {
      // réseau indisponible : on garde les données déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addSet = async (params: {
    exerciseId: string
    weightKg: number
    reps: number
    restSeconds: number | null
  }) => {
    if (!sessionId) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const existingForExercise = sets.filter((s) => s.exercise_id === params.exerciseId)
    await supabase.from('sets').insert({
      user_id: userData.user.id,
      session_id: sessionId,
      exercise_id: params.exerciseId,
      set_index: existingForExercise.length + 1,
      weight_kg: params.weightKg,
      reps: params.reps,
      rest_seconds: params.restSeconds,
    })
    await refresh()
  }

  const removeSet = async (id: string) => {
    await supabase.from('sets').delete().eq('id', id)
    await refresh()
  }

  return { sets, loading, addSet, removeSet, refresh }
}
