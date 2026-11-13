import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkoutSession } from '../lib/types'

export function useActiveSession() {
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!error) setSession((data as WorkoutSession | null) ?? null)
    } catch {
      // réseau indisponible : on garde l'état déjà en mémoire
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startSession = async (gymId: string | null) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase
      .from('workout_sessions')
      .insert({ user_id: userData.user.id, gym_id: gymId })
    await refresh()
  }

  const endSession = async () => {
    if (!session) return
    await supabase
      .from('workout_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id)
    await refresh()
  }

  return { session, loading, startSession, endSession, refresh }
}
