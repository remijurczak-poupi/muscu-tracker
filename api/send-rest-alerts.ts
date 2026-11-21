import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { setVapidDetails, sendNotification } from 'web-push'

type PushSubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string }
type RestAlertRow = {
  id: string
  user_id: string
  warning_at: string
  alert_at: string
  sent_warning: boolean
  sent_alert: boolean
}

// Appelée toutes les ~15s par un job pg_cron/pg_net dans Supabase (voir schema_v8b_cron.sql) :
// elle envoie une vraie notification push pour chaque repos arrivé à échéance, ce qui réveille le
// téléphone même si l'onglet du navigateur est gelé en arrière-plan (contrairement à un son joué
// depuis la page, qui ne peut pas se déclencher dans cet état).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VITE_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const { data: active, error } = await supabase
    .from('rest_alerts')
    .select('id, user_id, warning_at, alert_at, sent_warning, sent_alert')
    .eq('cancelled', false)
    .or('sent_warning.eq.false,sent_alert.eq.false')

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const now = Date.now()
  let sent = 0

  for (const row of (active ?? []) as RestAlertRow[]) {
    const dueWarning = !row.sent_warning && new Date(row.warning_at).getTime() <= now
    const dueAlert = !row.sent_alert && new Date(row.alert_at).getTime() <= now
    if (!dueWarning && !dueAlert) continue

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', row.user_id)

    const sendToAll = async (payload: string) => {
      for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
        try {
          await sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          sent++
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }
    }

    if (dueWarning) {
      await sendToAll(JSON.stringify({ title: '⏱️ Bientôt prêt', body: 'Encore 10 secondes de repos', tag: 'rest-warning' }))
    }
    if (dueAlert) {
      await sendToAll(JSON.stringify({ title: '💪 Repos terminé', body: 'Go, série suivante !', tag: 'rest-alert' }))
    }

    await supabase
      .from('rest_alerts')
      .update({ sent_warning: row.sent_warning || dueWarning, sent_alert: row.sent_alert || dueAlert })
      .eq('id', row.id)
  }

  res.status(200).json({ processed: active?.length ?? 0, sent })
}
