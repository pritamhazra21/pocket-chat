import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { onTypingInput, sendMessage, setTyping } from '../lib/chat.js'
import { uploadToCloudinary } from '../lib/cloudinary.js'
import { sendPush } from '../lib/push.js'
import EmojiPicker from './EmojiPicker.jsx'
import GifPicker from './GifPicker.jsx'

export default function MessageInput({ chatId, recipientUid }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [panel, setPanel] = useState(null) // 'emoji' | 'gif' | null
  const [upload, setUpload] = useState(null) // { progress }
  const fileRef = useRef(null)
  const cameraRef = useRef(null)
  const taRef = useRef(null)

  // Auto-grow the textarea with content, up to a max height.
  const adjustHeight = () => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const notify = (preview) =>
    sendPush({
      recipientUid,
      title: user.displayName || 'New message',
      body: preview,
      chatId,
    })

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto' // reset to one line
    setTyping(chatId, user.uid, false)
    await sendMessage(chatId, user.uid, recipientUid, { text: t })
    notify(t)
  }

  const onChange = (e) => {
    setText(e.target.value)
    adjustHeight()
    onTypingInput(chatId, user.uid)
  }

  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUpload({ progress: 0 })
    try {
      const media = await uploadToCloudinary(file, (p) => setUpload({ progress: p }))
      await sendMessage(chatId, user.uid, recipientUid, { media })
      notify(media.type === 'video' ? '🎥 Video' : '📷 Photo')
    } catch (err) {
      alert(err.message)
    } finally {
      setUpload(null)
    }
  }

  const sendGif = async (url) => {
    setPanel(null)
    await sendMessage(chatId, user.uid, recipientUid, { gif: url })
    notify('🎞️ GIF')
  }

  return (
    <div className="composer-wrap">
      {panel === 'emoji' && (
        <EmojiPicker onPick={(emoji) => setText((t) => t + emoji)} onClose={() => setPanel(null)} />
      )}
      {panel === 'gif' && <GifPicker onPick={sendGif} onClose={() => setPanel(null)} />}

      {upload && (
        <div className="upload-bar">
          Uploading… {upload.progress}%
          <div className="bar"><div className="fill" style={{ width: upload.progress + '%' }} /></div>
        </div>
      )}

      <div className="composer">
        <button
          className="icon-btn"
          onClick={() => setPanel(panel === 'emoji' ? null : 'emoji')}
          title="Emoji"
        >😊</button>
        <button
          className="icon-btn"
          onClick={() => setPanel(panel === 'gif' ? null : 'gif')}
          title="GIF"
        >GIF</button>

        <textarea
          ref={taRef}
          className="text-input composer-text"
          placeholder="Message"
          rows={1}
          value={text}
          onChange={onChange}
          onFocus={() => setPanel(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />

        <button className="icon-btn" onClick={() => cameraRef.current?.click()} title="Camera">📷</button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={pickFile}
        />

        <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Photo / Video">📎</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={pickFile}
        />

        {text.trim() ? (
          <button className="send-btn" onClick={send}>➤</button>
        ) : null}
      </div>
    </div>
  )
}
