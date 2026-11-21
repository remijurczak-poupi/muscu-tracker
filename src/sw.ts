/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

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
