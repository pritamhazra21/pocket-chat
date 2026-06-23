import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import Login from './components/Login.jsx'
import ChatList from './components/ChatList.jsx'
import ChatRoom from './components/ChatRoom.jsx'
import { listenForeground, registerForPush } from './lib/fcm.js'

export default function App() {
  const { user, loading } = useAuth()
  const [activeChat, setActiveChat] = useState(null) // { id, other }

  // Register for push + show foreground notifications once signed in.
  useEffect(() => {
    if (!user) return
    registerForPush(user.uid).catch(() => {})
    let unsub = () => {}
    listenForeground((payload) => {
      const title = payload.notification?.title || 'New message'
      const body = payload.notification?.body || ''
      if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        new Notification(title, { body, icon: '/icons/icon-192.png' })
      }
    }).then((fn) => (unsub = fn))
    return () => unsub()
  }, [user])

  if (loading) {
    return (
      <div className="center">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="app">
      {activeChat ? (
        <ChatRoom chat={activeChat} onBack={() => setActiveChat(null)} />
      ) : (
        <ChatList onOpen={setActiveChat} />
      )}
    </div>
  )
}
