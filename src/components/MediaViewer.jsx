import { downloadMedia } from '../lib/download.js'
import { IconClose, IconDownload } from './Icons.jsx'

export default function MediaViewer({ items, index, onIndex, onClose }) {
  const item = items[index]
  if (!item) return null

  const filename =
    item.type === 'video'
      ? `video-${item.id || index}.mp4`
      : `image-${item.id || index}.${item.type === 'gif' ? 'gif' : 'jpg'}`

  const go = (i) => onIndex(Math.max(0, Math.min(items.length - 1, i)))

  return (
    <div className="viewer fade-in" onClick={onClose}>
      <div className="viewer-top" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" onClick={onClose}><IconClose size={24} /></button>
        <span className="muted">{index + 1} / {items.length}</span>
        <button
          className="icon-btn"
          title="Save to device"
          onClick={() => downloadMedia(item.url, filename)}
        >
          <IconDownload size={24} />
        </button>
      </div>

      <div className="viewer-body" onClick={(e) => e.stopPropagation()}>
        {item.type === 'video' ? (
          <video className="viewer-media" src={item.url} controls autoPlay playsInline />
        ) : (
          <img className="viewer-media" src={item.url} alt="media" />
        )}
      </div>

      {index > 0 && (
        <button
          className="viewer-nav left"
          onClick={(e) => { e.stopPropagation(); go(index - 1) }}
        >
          ‹
        </button>
      )}
      {index < items.length - 1 && (
        <button
          className="viewer-nav right"
          onClick={(e) => { e.stopPropagation(); go(index + 1) }}
        >
          ›
        </button>
      )}
    </div>
  )
}
