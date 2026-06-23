import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Lightweight Firestore presence: heartbeat while visible + mark offline on hide/unload.
// (For rock-solid "offline" detection you'd add Realtime Database onDisconnect — see README.)
let heartbeat = null

async function write(uid, online) {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { online, lastSeen: serverTimestamp() },
      { merge: true }
    )
  } catch (e) {
    // ignore transient write errors (offline, etc.)
  }
}

export function startPresence(uid) {
  stopPresence()
  write(uid, true)

  heartbeat = setInterval(() => {
    if (document.visibilityState === 'visible') write(uid, true)
  }, 25000)

  const onVisibility = () => write(uid, document.visibilityState === 'visible')
  const onLeave = () => write(uid, false)

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('beforeunload', onLeave)
  window.addEventListener('pagehide', onLeave)

  stopPresence._cleanup = () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('beforeunload', onLeave)
    window.removeEventListener('pagehide', onLeave)
  }
}

export function stopPresence(uid) {
  if (heartbeat) clearInterval(heartbeat)
  heartbeat = null
  if (stopPresence._cleanup) {
    stopPresence._cleanup()
    stopPresence._cleanup = null
  }
  if (uid) write(uid, false)
}

// Consider a user "online" only if their flag is true AND heartbeat is recent.
export function isOnline(user) {
  if (!user?.online) return false
  const last = user.lastSeen?.toMillis ? user.lastSeen.toMillis() : 0
  return Date.now() - last < 60000
}
