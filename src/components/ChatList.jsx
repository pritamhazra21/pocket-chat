import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureChat, listenAllUsers, listenChats, listenPrefs } from '../lib/chat.js'
import Settings from './Settings.jsx'

export default function ChatList({ onOpen }) {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [prefs, setPrefs] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => listenChats(user.uid, setChats), [user.uid])
  useEffect(() => listenPrefs(user.uid, setPrefs), [user.uid])

  // Load the people directory only while the "new chat" sheet is open.
  useEffect(() => {
    if (!showNew) return
    return listenAllUsers(setPeople)
  }, [showNew])

  // Apply a private nickname if I've set one for this person.
  const nameFor = (uid, fallback) => prefs?.nicknames?.[uid] || fallback || 'Unknown'

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
    <div className="screen" onClick={() => menuOpen && setMenuOpen(false)}>
      <header className="topbar">
        <div className="me">
          {user.photoURL && <img className="avatar sm" src={user.photoURL} alt="" />}
        </div>

        <div className="title">Pocket Chat</div>

        <div className="menu-wrap">
          <button
            className="icon-btn dots"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            title="Menu"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="dropdown" onClick={(e) => e.stopPropagation()}>
              <button
                className="dropdown-item"
                onClick={() => {
                  setMenuOpen(false)
                  setShowSettings(true)
                }}
              >
                ⚙️ Settings
              </button>
              <button className="dropdown-item" onClick={() => setMenuOpen(false)}>
                ✖ Close
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="list">
        {chats.length === 0 && (
          <p className="muted empty">No chats yet. Tap + to start one.</p>
        )}
        {chats.map((chat) => {
          const other = otherOf(chat)
          const unread = chat.unread?.[user.uid] || 0
          return (
            <button
              key={chat.id}
              className={'list-item' + (unread ? ' unread' : '')}
              onClick={() => onOpen({ id: chat.id, other })}
            >
              {other.photoURL ? (
                <img className="avatar" src={other.photoURL} alt="" />
              ) : (
                <div className="avatar placeholder">{nameFor(other.uid, other.displayName)[0]}</div>
              )}
              <div className="list-text">
                <div className="row">
                  <span className="name">{nameFor(other.uid, other.displayName)}</span>
                </div>
                <span className="preview muted">{chat.lastMessage || 'Say hi 👋'}</span>
              </div>
              {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
            </button>
          )
        })}
      </div>

      <button className="fab" onClick={() => setShowNew(true)}>+</button>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

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
