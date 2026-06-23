import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
export function listenChats(uid, cb) {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageTime', 'desc')
  )
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
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
export async function sendMessage(chatId, senderId, payload) {
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
export async function markRead(chatId, uid) {
  await updateDoc(doc(db, 'chats', chatId), {
    [`lastRead.${uid}`]: serverTimestamp(),
  }).catch(() => {})
}
