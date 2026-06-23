import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

// Deterministic 1:1 chat id so both users resolve to the same document.
export function chatIdFor(a, b) {
  return [a, b].sort().join('_')
}

// Create/refresh the signed-in user's profile doc.
export async function upsertUser(user) {
  await setDoc(
    doc(db, 'users', user.uid),
    {
      uid: user.uid,
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      emailLower: (user.email || '').toLowerCase(),
      photoURL: user.photoURL || '',
    },
    { merge: true }
  )
}

// Live list of every user who has signed in (the people directory).
export function listenAllUsers(cb) {
  const q = query(collection(db, 'users'), orderBy('displayName'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data())))
}

// Find a person to chat with by exact email.
export async function findUserByEmail(email) {
  const q = query(
    collection(db, 'users'),
    where('emailLower', '==', email.trim().toLowerCase()),
    limit(1)
  )
  const snap = await getDocs(q)
  return snap.empty ? null : snap.docs[0].data()
}

// Ensure the chat doc exists for two users.
export async function ensureChat(me, other) {
  const id = chatIdFor(me.uid, other.uid)
  const ref = doc(db, 'chats', id)
  const existing = await getDoc(ref)
  if (!existing.exists()) {
    await setDoc(ref, {
      participants: [me.uid, other.uid],
      participantInfo: {
        [me.uid]: { displayName: me.displayName, photoURL: me.photoURL || '' },
        [other.uid]: { displayName: other.displayName, photoURL: other.photoURL || '' },
      },
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      typing: {},
    })
  }
  return id
}

// Live list of my chats, newest activity first.
// NOTE: we deliberately don't orderBy() in the query — combining
// array-contains with orderBy needs a composite index. We sort client-side.
export function listenChats(uid, cb) {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid))
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      rows.sort(
        (a, b) => (b.lastMessageTime?.toMillis?.() || 0) - (a.lastMessageTime?.toMillis?.() || 0)
      )
      cb(rows)
    },
    (err) => console.error('[chats] listen failed:', err)
  )
}

// Live messages in a chat.
export function listenMessages(chatId, cb) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(200)
  )
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

// Live single chat doc (for typing + presence-ish metadata).
export function listenChat(chatId, cb) {
  return onSnapshot(doc(db, 'chats', chatId), (d) => cb(d.exists() ? { id: d.id, ...d.data() } : null))
}

// Live single user doc (for online/offline + lastSeen).
export function listenUser(uid, cb) {
  return onSnapshot(doc(db, 'users', uid), (d) => cb(d.exists() ? d.data() : null))
}

// payload: { text } | { media: { url, type } } | { gif: url }
export async function sendMessage(chatId, senderId, recipientId, payload) {
  const msg = {
    senderId,
    createdAt: serverTimestamp(),
    type: 'text',
    text: '',
    media: null,
  }
  let preview = ''
  if (payload.text) {
    msg.type = 'text'
    msg.text = payload.text
    preview = payload.text
  } else if (payload.gif) {
    msg.type = 'gif'
    msg.media = { url: payload.gif, type: 'gif' }
    preview = '🎞️ GIF'
  } else if (payload.media) {
    msg.type = payload.media.type === 'video' ? 'video' : 'image'
    msg.media = payload.media
    preview = payload.media.type === 'video' ? '🎥 Video' : '📷 Photo'
  }

  await addDoc(collection(db, 'chats', chatId, 'messages'), msg)
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: preview,
    lastMessageTime: serverTimestamp(),
    lastMessageSender: senderId,
    // bump the recipient's unread counter
    [`unread.${recipientId}`]: increment(1),
  })
}

// Delete a single message (removes it for both participants).
export async function deleteMessage(chatId, msgId) {
  await deleteDoc(doc(db, 'chats', chatId, 'messages', msgId))
}

// Clear an entire conversation — delete all messages and reset chat metadata.
export async function clearChat(chatId) {
  const snap = await getDocs(collection(db, 'chats', chatId, 'messages'))
  // writeBatch handles up to 500 ops; chunk to be safe.
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = writeBatch(db)
    snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: '',
    lastMessageSender: '',
    unread: {},
  })
}

// Typing indicator: store last-typed timestamp per uid on the chat doc.
let typingTimer = null
export async function setTyping(chatId, uid, isTyping) {
  await updateDoc(doc(db, 'chats', chatId), {
    [`typing.${uid}`]: isTyping ? Date.now() : 0,
  }).catch(() => {})
}

export function onTypingInput(chatId, uid) {
  setTyping(chatId, uid, true)
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => setTyping(chatId, uid, false), 3000)
}

// Mark the chat as read up to "now" for this user. Used for read receipts:
// the OTHER person's lastRead tells us which of my messages they've seen.
// Also clears this user's unread counter.
export async function markRead(chatId, uid) {
  await updateDoc(doc(db, 'chats', chatId), {
    [`lastRead.${uid}`]: serverTimestamp(),
    [`unread.${uid}`]: 0,
  }).catch(() => {})
}

// ---- Private per-user preferences (nicknames). Stored under the user's own
// private subcollection so only they can read/write them. ----
function prefsRef(uid) {
  return doc(db, 'users', uid, 'private', 'prefs')
}

export function listenPrefs(uid, cb) {
  return onSnapshot(
    prefsRef(uid),
    (d) => cb(d.exists() ? d.data() : {}),
    (err) => console.error('[prefs] listen failed:', err)
  )
}

// Save (or clear, if empty) a private nickname for another user.
export async function setNickname(uid, otherUid, nickname) {
  await setDoc(prefsRef(uid), { nicknames: { [otherUid]: nickname || '' } }, { merge: true })
}
