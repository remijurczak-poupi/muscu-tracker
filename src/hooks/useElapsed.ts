import { useEffect, useState } from 'react'

/** Secondes écoulées depuis `since` (timestamp ms), rafraîchies chaque seconde. */
export function useElapsed(since: number | null): number {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (since === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [since])

  if (since === null) return 0
  return Math.max(0, Math.floor((now - since) / 1000))
}
