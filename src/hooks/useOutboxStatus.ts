import { useEffect, useState } from 'react'
import { onOutboxChange, outboxSize } from '../lib/offline'

/** Combien d'actions attendent d'être synchronisées, et si le navigateur se dit en ligne. */
export function useOutboxStatus() {
  const [count, setCount] = useState(() => outboxSize())
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const update = () => setCount(outboxSize())
    const unsubscribe = onOutboxChange(update)
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { count, online }
}
