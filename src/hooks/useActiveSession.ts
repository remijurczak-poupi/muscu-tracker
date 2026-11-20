import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import {
  queueInsert,
  getPendingInserts,
  isPending,
  updatePendingInsert,
  cancelPendingInsert,
  onOutboxChange,
} from '../lib/offline'
import type { WorkoutSession } from '../lib/types'

export function useActiveSession() {
  const { session: authSession } = useAuth()
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    let fromDb: WorkoutSession | null = null
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!error) fromDb = (data as WorkoutSession | null) ?? null
    } catch {
      // hors-ligne : on retombe sur une séance pas encore synchronisée, s'il y en a une
    } finally {
      setLoading(false)
    }
    if (fromDb) {
      setSession(fromDb)
      return
    }
    const pending = getPendingInserts<WorkoutSession>('workout_sessions').find((s) => !s.ended_at)
    setSession(pending ?? null)
  }, [])

  useEffect(() => {
    refresh()
    return onOutboxChange(refresh)
  }, [refresh])

  const startSession = async (gymId: string | null) => {
    const userId = authSession?.user.id
    if (!userId) return
    const row: WorkoutSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      gym_id: gymId,
      started_at: new Date().toISOString(),
      ended_at: null,
      notes: null,
    }
    // Optimiste et non bloquant : la séance démarre tout de suite même sans réseau.
    setSession(row)
    void (async () => {
      try {
        const { error } = await supabase.from('workout_sessions').insert(row)
        if (error) throw error
      } catch {
        queueInsert('workout_sessions', row)
      }
    })()
  }

  const endSession = async () => {
    if (!session) return
    if (isPending('workout_sessions', session.id)) {
      updatePendingInsert('workout_sessions', session.id, { ended_at: new Date().toISOString() })
      setSession(null)
      return
    }
    await supabase
      .from('workout_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id)
    await refresh()
  }

  const cancelSession = async () => {
    if (!session) return
    if (isPending('workout_sessions', session.id)) {
      cancelPendingInsert('workout_sessions', session.id)
      setSession(null)
      return
    }
    await supabase.from('workout_sessions').delete().eq('id', session.id)
    await refresh()
  }

  return { session, loading, startSession, endSession, cancelSession, refresh }
}
