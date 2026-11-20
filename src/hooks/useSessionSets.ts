import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { queueInsert, queueDelete, isPending, getPendingInserts, onOutboxChange } from '../lib/offline'
import type { SetRow } from '../lib/types'

export function useSessionSets(sessionId: string | null) {
  const { session: authSession } = useAuth()
  const [sets, setSets] = useState<SetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setSets([])
      setPendingIds(new Set())
      setLoading(false)
      return
    }
    let fromDb: SetRow[] = []
    try {
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      if (!error && data) fromDb = data as SetRow[]
    } catch {
      // hors-ligne : on complète avec ce qu'il y a dans la file d'attente
    } finally {
      setLoading(false)
    }
    const pending = getPendingInserts<SetRow>('sets').filter((s) => s.session_id === sessionId)
    const merged = [...fromDb, ...pending.filter((p) => !fromDb.some((d) => d.id === p.id))].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    setSets(merged)
    setPendingIds(new Set(pending.map((p) => p.id)))
  }, [sessionId])

  useEffect(() => {
    refresh()
    return onOutboxChange(refresh)
  }, [refresh])

  // Optimiste et non bloquant : la série apparaît tout de suite (chrono de repos, records inclus),
  // la synchro se fait en fond — nécessaire car une salle a souvent peu/pas de réseau.
  const addSet = async (params: {
    exerciseId: string
    weightKg: number
    reps: number
    restSeconds: number | null
  }) => {
    if (!sessionId) return
    const userId = authSession?.user.id
    if (!userId) return
    const existingForExercise = sets.filter((s) => s.exercise_id === params.exerciseId)
    const row: SetRow = {
      id: crypto.randomUUID(),
      user_id: userId,
      session_id: sessionId,
      exercise_id: params.exerciseId,
      set_index: existingForExercise.length + 1,
      weight_kg: params.weightKg,
      reps: params.reps,
      rest_seconds: params.restSeconds,
      created_at: new Date().toISOString(),
    }
    setSets((prev) => [...prev, row])
    setPendingIds((prev) => new Set(prev).add(row.id))
    void (async () => {
      try {
        const { error } = await supabase.from('sets').insert(row)
        if (error) throw error
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      } catch {
        queueInsert('sets', row)
      }
    })()
  }

  const removeSet = async (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id))
    setPendingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (isPending('sets', id)) {
      queueDelete('sets', id)
      return
    }
    void (async () => {
      try {
        const { error } = await supabase.from('sets').delete().eq('id', id)
        if (error) throw error
      } catch {
        queueDelete('sets', id)
      }
    })()
  }

  const updateSet = async (id: string, params: { weightKg: number; reps: number }) => {
    await supabase.from('sets').update({ weight_kg: params.weightKg, reps: params.reps }).eq('id', id)
    await refresh()
  }

  return { sets, loading, pendingIds, addSet, removeSet, updateSet, refresh }
}
