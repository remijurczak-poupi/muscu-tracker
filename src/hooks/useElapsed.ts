import { useEffect, useState } from 'react'

/** Secondes écoulées depuis `since` (timestamp ms), rafraîchies chaque seconde. */
export function useElapsed(since: number | null): number {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (since === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    // Resynchronise tout de suite au retour au premier plan, sans attendre le prochain tick :
    // le navigateur suspend souvent setInterval pendant que l'onglet est caché.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [since])

  if (since === null) return 0
  return Math.max(0, Math.floor((now - since) / 1000))
}
