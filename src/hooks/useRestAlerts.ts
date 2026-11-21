import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const WARNING_LEAD = 10

/**
 * Programme côté serveur une vraie notification push pour la fin du repos en cours (et une 10s
 * avant), en plus du bip joué localement — nécessaire car le bip ne peut pas se déclencher quand
 * le téléphone est sur une autre appli (le navigateur suspend alors tout le JS de la page).
 */
export function useRestAlerts(sessionId: string | null, lastSetAt: number | null, target: number) {
  const { session: authSession } = useAuth()
  const userId = authSession?.user.id

  useEffect(() => {
    if (!sessionId || lastSetAt === null || !userId) return
    const warningAt = new Date(lastSetAt + Math.max(0, target - WARNING_LEAD) * 1000).toISOString()
    const alertAt = new Date(lastSetAt + target * 1000).toISOString()
    void (async () => {
      try {
        // Un repos qui redémarre invalide l'alerte précédente de cette séance si elle n'est pas
        // encore sortie, pour ne pas recevoir une notif en retard liée à l'ancien repos.
        await supabase.from('rest_alerts').update({ cancelled: true }).eq('session_id', sessionId).eq('sent_alert', false)
        await supabase.from('rest_alerts').insert({ user_id: userId, session_id: sessionId, warning_at: warningAt, alert_at: alertAt })
      } catch {
        // hors-ligne : pas de notif push pour ce repos, le bip local prend le relais s'il peut
      }
    })()
  }, [sessionId, lastSetAt, target, userId])
}

export async function cancelRestAlerts(sessionId: string) {
  try {
    await supabase.from('rest_alerts').update({ cancelled: true }).eq('session_id', sessionId).eq('sent_alert', false)
  } catch {
    // hors-ligne : rien à faire, l'alerte restante sonnera simplement une fois de trop
  }
}
