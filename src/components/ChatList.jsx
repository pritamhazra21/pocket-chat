import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureChat, findUserByEmail, listenChats } from '../lib/chat.js'

export default function ChatList({ onOpen }) {
  const { user, logout } = useAuth()
  const [chats, setChats] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => listenChats(user.uid, setChats), [user.uid])

  const otherOf = (chat) => {
    const otherUid = chat.participants.find((p) => p !== user.uid)
    return { uid: otherUid, ...(chat.participantInfo?.[otherUid] || {}) }
  }

  const startChat = async () => {
    if (!email.trim()) return
    setBusy(true)
    try {
      const found = await findUserByEmail(email)
      if (!found) {
        alert('No user with that email has signed in yet.')
        return
      }
      if (found.uid === user.uid) {
        alert("That's you!")
        return
      }
      const me = { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL }
      const id = await ensureChat(me, found)
      setShowNew(false)
      setEmail('')
      onOpen({ id, other: { uid: found.uid, displayName: found.displayName, photoURL: found.photoURL } })
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <div className="me">
          {user.photoURL && <img className="avatar sm" src={user.photoURL} alt="" />}
          <span>{user.displayName}</span>
        </div>
        <button className="icon-btn" onClick={logout} title="Sign out">⎋</button>
      </header>

      <div className="list">
        {chats.length === 0 && (
          <p className="muted empty">No chats yet. Tap + to start one.</p>
        )}
        {chats.map((chat) => {
          const other = otherOf(chat)
          return (
            <button key={chat.id} className="list-item" onClick={() => onOpen({ id: chat.id, other })}>
              {other.photoURL ? (
                <img className="avatar" src={other.photoURL} alt="" />
              ) : (
                <div className="avatar placeholder">{(other.displayName || '?')[0]}</div>
              )}
              <div className="list-text">
                <div className="row">
                  <span className="name">{other.displayName || 'Unknown'}</span>
                </div>
                <span className="preview muted">{chat.lastMessage || 'Say hi 👋'}</span>
              </div>
            </button>
          )
        })}
      </div>

      <button className="fab" onClick={() => setShowNew(true)}>+</button>

      {showNew && (
        <div className="sheet-backdrop" onClick={() => setShowNew(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>New chat</h3>
            <p className="muted">Enter the email of someone who has signed in.</p>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startChat()}
              autoFocus
            />
            <button className="primary" disabled={busy} onClick={startChat}>
              {busy ? 'Starting…' : 'Start chat'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
