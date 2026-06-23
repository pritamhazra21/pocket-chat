import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureChat, listenAllUsers, listenChats } from '../lib/chat.js'

export default function ChatList({ onOpen }) {
  const { user, logout } = useAuth()
  const [chats, setChats] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => listenChats(user.uid, setChats), [user.uid])

  // Load the people directory only while the "new chat" sheet is open.
  useEffect(() => {
    if (!showNew) return
    return listenAllUsers(setPeople)
  }, [showNew])

  const otherOf = (chat) => {
    const otherUid = chat.participants.find((p) => p !== user.uid)
    return { uid: otherUid, ...(chat.participantInfo?.[otherUid] || {}) }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return people
      .filter((p) => p.uid !== user.uid)
      .filter(
        (p) =>
          !q ||
          (p.displayName || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q)
      )
  }, [people, search, user.uid])

  const startChatWith = async (person) => {
    if (busy) return
    setBusy(true)
    try {
      const me = { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL }
      const id = await ensureChat(me, person)
      setShowNew(false)
      setSearch('')
      onOpen({
        id,
        other: { uid: person.uid, displayName: person.displayName, photoURL: person.photoURL },
      })
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
            <p className="muted">Tap a person to start chatting.</p>
            <input
              type="text"
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />

            <div className="people-list">
              {filtered.length === 0 && (
                <p className="muted empty">
                  {people.length <= 1
                    ? 'No one else has signed in yet.'
                    : 'No people match your search.'}
                </p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.uid}
                  className="list-item"
                  disabled={busy}
                  onClick={() => startChatWith(p)}
                >
                  {p.photoURL ? (
                    <img className="avatar" src={p.photoURL} alt="" />
                  ) : (
                    <div className="avatar placeholder">{(p.displayName || '?')[0]}</div>
                  )}
                  <div className="list-text">
                    <span className="name">{p.displayName || 'Unknown'}</span>
                    <span className="preview muted">{p.email}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
