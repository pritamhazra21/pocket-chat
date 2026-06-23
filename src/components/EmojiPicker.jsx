import Picker, { Theme } from 'emoji-picker-react'
import { IconClose } from './Icons.jsx'

export default function EmojiPicker({ onPick, onClose }) {
  return (
    <div className="panel emoji-panel">
      <div className="panel-head">
        <span>Emoji</span>
        <button className="icon-btn" onClick={onClose}><IconClose /></button>
      </div>
      <Picker
        onEmojiClick={(e) => onPick(e.emoji)}
        width="100%"
        height={320}
        theme={Theme.DARK}
        previewConfig={{ showPreview: false }}
        lazyLoadEmojis
      />
    </div>
  )
}
