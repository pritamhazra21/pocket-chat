import Picker from 'emoji-picker-react'

export default function EmojiPicker({ onPick, onClose }) {
  return (
    <div className="panel emoji-panel">
      <div className="panel-head">
        <span>Emoji</span>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      <Picker
        onEmojiClick={(e) => onPick(e.emoji)}
        width="100%"
        height={320}
        previewConfig={{ showPreview: false }}
        lazyLoadEmojis
      />
    </div>
  )
}
