import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { listenChat, listenMessages, listenUser, markRead } from '../lib/chat.js'
import { isOnline } from '../lib/presence.js'
import MessageBubble from './MessageBubble.jsx'
import MessageInput from './MessageInput.jsx'

export default function ChatRoom({ chat, onBack }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [chatDoc, setChatDoc] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => listenMessages(chat.id, setMessages), [chat.id])
  useEffect(() => listenChat(chat.id, setChatDoc), [chat.id])
  useEffect(() => listenUser(chat.other.uid, setOtherUser), [chat.other.uid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Read receipts: while this chat is open and visible, mark it read whenever
  // a new incoming message arrives (and when the tab/app regains focus).
  useEffect(() => {
    const last = messages[messages.length - 1]
    const hasIncoming = last && last.senderId !== user.uid
    const markIfVisible = () => {
      if (document.visibilityState === 'visible') markRead(chat.id, user.uid)
    }
    if (hasIncoming) markIfVisible()
    document.addEventListener('visibilitychange', markIfVisible)
    return () => document.removeEventListener('visibilitychange', markIfVisible)
  }, [messages, chat.id, user.uid])

  const typingTs = chatDoc?.typing?.[chat.other.uid] || 0
  const otherTyping = Date.now() - typingTs < 4000

  // For my own messages: when did the other person last read / last appear online?
  const otherLastRead = chatDoc?.lastRead?.[chat.other.uid] || null
  const otherLastSeen = otherUser?.lastSeen || null

  const status = otherTyping
    ? 'typing…'
    : isOnline(otherUser)
    ? 'online'
    : lastSeenText(otherUser?.lastSeen)

  return (
    <div className="screen">
      <header className="topbar chat-head">
        <button className="icon-btn" onClick={onBack}>‹</button>
        {chat.other.photoURL ? (
          <img className="avatar sm" src={chat.other.photoURL} alt="" />
        ) : (
          <div className="avatar sm placeholder">{(chat.other.displayName || '?')[0]}</div>
        )}
        <div className="head-text">
          <span className="name">{chat.other.displayName}</span>
          <span className={'status ' + (status === 'online' ? 'on' : '')}>{status}</span>
        </div>
      </header>

      <div className="messages">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            mine={m.senderId === user.uid}
            otherLastRead={otherLastRead}
            otherLastSeen={otherLastSeen}
          />
        ))}
        {otherTyping && (
          <div className="bubble in typing-bubble">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput chatId={chat.id} recipientUid={chat.other.uid} />
    </div>
  )
}

function lastSeenText(ts) {
  if (!ts?.toMillis) return 'offline'
  const d = new Date(ts.toMillis())
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return sameDay ? `last seen ${time}` : `last seen ${d.toLocaleDateString()}`
}
