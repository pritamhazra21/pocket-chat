// Custom service worker: Workbox precache (offline) + Firebase background push.
import { precacheAndRoute } from 'workbox-precaching'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

// vite-plugin-pwa injects the precache manifest here.
precacheAndRoute(self.__WB_MANIFEST || [])

self.skipWaiting()
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (firebaseConfig.apiKey) {
  const app = initializeApp(firebaseConfig)
  const messaging = getMessaging(app)

  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'New message'
    const body = payload.notification?.body || payload.data?.body || ''
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.data?.url || '/' },
      tag: payload.data?.chatId || 'chat',
      renotify: true,
    })
  })
}

// Focus/open the app when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
