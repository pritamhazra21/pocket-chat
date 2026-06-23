import { useMemo, useState } from 'react'
import { downloadMedia, extractLinks } from '../lib/download.js'

export default function ChatInfo({ title, mediaItems, messages, onOpenMedia, onClose }) {
  const [tab, setTab] = useState('media')

  const links = useMemo(() => {
    const out = []
    for (const m of messages) {
      if (m.type !== 'text' || !m.text) continue
      for (const url of extractLinks(m.text)) {
        out.push({ url, id: m.id + url, time: m.createdAt })
      }
    }
    return out.reverse() // newest first
  }, [messages])

  return (
    <div className="screen info-page slide-in">
      <header className="topbar">
        <button className="icon-btn" onClick={onClose}>‹</button>
        <div className="title">{title}</div>
      </header>

      <div className="tabs">
        <button className={'tab' + (tab === 'media' ? ' active' : '')} onClick={() => setTab('media')}>
          Media ({mediaItems.length})
        </button>
        <button className={'tab' + (tab === 'links' ? ' active' : '')} onClick={() => setTab('links')}>
          Links ({links.length})
        </button>
      </div>

      {tab === 'media' && (
        <div className="gallery">
          {mediaItems.length === 0 && <p className="muted empty">No media yet.</p>}
          <div className="gallery-grid">
            {mediaItems.map((m, i) => (
              <button key={m.id} className="gallery-cell" onClick={() => onOpenMedia(i)}>
                {m.type === 'video' ? (
                  <>
                    <video src={m.url} preload="metadata" />
                    <span className="play-badge">▶</span>
                  </>
                ) : (
                  <img src={m.url} alt="media" loading="lazy" />
                )}
                <button
                  className="cell-download"
                  title="Save"
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadMedia(m.url, `media-${i}`)
                  }}
                >
                  ⬇
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'links' && (
        <div className="links-list">
          {links.length === 0 && <p className="muted empty">No links yet.</p>}
          {links.map((l) => (
            <a key={l.id} className="link-item" href={l.url} target="_blank" rel="noreferrer">
              <span className="link-icon">🔗</span>
              <span className="link-url">{l.url}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
