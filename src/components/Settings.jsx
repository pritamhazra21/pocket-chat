import { useAuth } from '../context/AuthContext.jsx'
import { CHAT_BGS, THEMES, useTheme } from '../context/ThemeContext.jsx'

export default function Settings({ onClose }) {
  const { user, logout } = useAuth()
  const { theme, setTheme, chatBg, setChatBg } = useTheme()
  const notifPerm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet settings" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="profile-card">
          {user.photoURL ? (
            <img className="avatar lg" src={user.photoURL} alt="" />
          ) : (
            <div className="avatar lg placeholder">{(user.displayName || '?')[0]}</div>
          )}
          <div className="profile-text">
            <span className="name">{user.displayName}</span>
            <span className="muted">{user.email}</span>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-section">
            <span className="settings-label">🎨 Theme</span>
            <div className="option-row">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={'pill' + (theme === t.id ? ' active' : '')}
                  onClick={() => setTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <span className="settings-label">🖼️ Chat background</span>
            <div className="swatches">
              {CHAT_BGS.map((b) => (
                <button
                  key={b.id}
                  className={'swatch bg-' + b.id + (chatBg === b.id ? ' active' : '')}
                  onClick={() => setChatBg(b.id)}
                  title={b.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-row">
            <span>🔔 Notifications</span>
            <span className="muted">{notifPerm}</span>
          </div>
          <div className="settings-row">
            <span>📦 Version</span>
            <span className="muted">Pocket Chat 0.1.0</span>
          </div>
        </div>

        <button className="danger" onClick={logout}>Sign out</button>
      </div>
    </div>
  )
}
