import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { arrayUnion, doc, setDoc } from 'firebase/firestore'
import { app, db } from '../firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let messaging = null

export async function initMessaging() {
  if (messaging) return messaging
  if (!(await isSupported())) return null
  messaging = getMessaging(app)
  return messaging
}

// Ask for permission, get the FCM token, store it on the user doc so the
// Cloudflare Worker can target this device.
export async function registerForPush(uid) {
  const m = await initMessaging()
  if (!m || !VAPID_KEY) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  // The PWA service worker (src/sw.js) also handles FCM background messages.
  const registration = await navigator.serviceWorker.ready
  const token = await getToken(m, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  if (!token) return null

  await setDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) }, { merge: true })
  return token
}

// Foreground messages (app is open) — show a local notification.
export async function listenForeground(handler) {
  const m = await initMessaging()
  if (!m) return () => {}
  return onMessage(m, (payload) => handler?.(payload))
}
