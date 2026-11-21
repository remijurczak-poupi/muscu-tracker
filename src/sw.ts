/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

// injectManifest ne l'ajoute pas automatiquement (contrairement à generateSW) : sans ça, le nouveau
// SW reste bloqué en "waiting" tant que l'onglet/PWA n'est jamais complètement fermé, et le téléphone
// continue de servir l'ancien bundle — donc la bannière de notifications n'apparaît jamais.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
clientsClaim()

self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, tag } = event.data.json() as { title: string; body: string; tag?: string }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      // "vibrate" existe dans la spec Notification mais manque encore des types DOM de TS.
      ...({ vibrate: [200, 100, 200] } as object),
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c)
      if (existing) return (existing as WindowClient).focus()
      return self.clients.openWindow('/')
    }),
  )
})
