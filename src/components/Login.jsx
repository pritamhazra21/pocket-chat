import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  return (
    <div className="center login">
      <div className="logo">💬</div>
      <h1>Pocket Chat</h1>
      <p className="muted">Private 1:1 messaging</p>
      <button className="google-btn" onClick={() => login().catch((e) => alert(e.message))}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 7.1 29.5 5 24 5 16 5 9.1 9.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 43c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.2 26.7 35 24 35c-5.2 0-9.6-3.6-11.3-8.4l-6.5 5C9 38.6 15.9 43 24 43z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C39.9 35.7 45 30.5 45 24c0-1.2-.1-2.3-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
    </div>
  )
}
