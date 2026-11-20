import { useEffect } from 'react'

type WakeLockSentinel = { release: () => Promise<void> }
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> }
}

/**
 * Empêche l'écran de se verrouiller tant que `active` est vrai. Sans ça, le navigateur suspend
 * les timers JS une fois l'écran éteint — le chrono de repos (et son bip) ne reprend qu'au retour
 * sur l'appli, parfois minutes après l'heure prévue. Non supporté partout (iOS < 16.4) : échoue
 * silencieusement, tant pis.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const nav = navigator as NavigatorWithWakeLock
    if (!nav.wakeLock) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        const s = await nav.wakeLock!.request('screen')
        if (cancelled) {
          void s.release()
          return
        }
        sentinel = s
      } catch {
        // refusé (ex: onglet caché) ou non supporté, tant pis
      }
    }

    // Le wake lock est relâché automatiquement quand l'onglet passe en arrière-plan ;
    // on le redemande dès qu'on redevient visible.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel) void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (sentinel) void sentinel.release()
    }
  }, [active])
}
