import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getPushPermissionState, subscribeToPush } from '../lib/push'

type State = 'checking' | 'unsupported' | 'default' | 'denied' | 'granted'

export function usePushSubscription() {
  const { session } = useAuth()
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    let cancelled = false
    void getPushPermissionState().then((s) => {
      if (!cancelled) setState(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = async () => {
    const userId = session?.user.id
    if (!userId) return
    const ok = await subscribeToPush(userId)
    setState(ok ? 'granted' : 'denied')
  }

  return { state, subscribe }
}
