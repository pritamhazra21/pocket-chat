function timeOf(ts) {
  if (!ts?.toMillis) return ''
  return new Date(ts.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const ms = (ts) => (ts?.toMillis ? ts.toMillis() : 0)

// sent → single ✓ | delivered (recipient was online after) → ✓✓ | read → blue ✓✓
function statusOf(message, otherLastRead, otherLastSeen) {
  const t = ms(message.createdAt) || Date.now() // pending write → treat as just-sent
  if (ms(otherLastRead) >= t) return 'read'
  if (ms(otherLastSeen) >= t) return 'delivered'
  return 'sent'
}

function Ticks({ status }) {
  const single = status === 'sent'
  return (
    <svg
      className={'ticks ' + status}
      viewBox="0 0 18 12"
      width="18"
      height="12"
      aria-label={status}
    >
      {/* first check */}
      <path d="M2 7 L5 10 L11 3" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* second check (hidden for single) */}
      {!single && (
        <path d="M7 7 L10 10 L16 3" fill="none" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

export default function MessageBubble({ message, mine, otherLastRead, otherLastSeen }) {
  const { type, text, media } = message
  const status = mine ? statusOf(message, otherLastRead, otherLastSeen) : null

  return (
    <div className={'bubble ' + (mine ? 'out' : 'in')}>
      {type === 'text' && <span className="text">{text}</span>}

      {type === 'image' && (
        <a href={media.url} target="_blank" rel="noreferrer">
          <img className="media" src={media.url} alt="shared" loading="lazy" />
        </a>
      )}

      {type === 'gif' && <img className="media gif" src={media.url} alt="gif" loading="lazy" />}

      {type === 'video' && (
        <video className="media" src={media.url} controls playsInline preload="metadata" />
      )}

      <span className="meta">
        <span className="time">{timeOf(message.createdAt)}</span>
        {mine && <Ticks status={status} />}
      </span>
    </div>
  )
}
