import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { onTypingInput, sendMessage, setTyping } from '../lib/chat.js'
import { uploadToCloudinary } from '../lib/cloudinary.js'
import { sendPush } from '../lib/push.js'
import EmojiPicker from './EmojiPicker.jsx'
import GifPicker from './GifPicker.jsx'
import { IconCamera, IconMic, IconPaperclip, IconSend, IconSmile, IconTrash } from './Icons.jsx'

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export default function MessageInput({ chatId, recipientUid }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [panel, setPanel] = useState(null) // 'emoji' | 'gif' | null
  const [upload, setUpload] = useState(null) // { progress }
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const fileRef = useRef(null)
  const cameraRef = useRef(null)
  const taRef = useRef(null)
  const recRef = useRef(null) // { rec, stream, chunks, start }
  const recTimer = useRef(null)

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
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.focus() // keep the keyboard open
    }
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

  // ---- Voice messages ----
  const startRecording = async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.start()
      recRef.current = { rec, stream, chunks, start: Date.now() }
      setRecording(true)
      setRecSecs(0)
      recTimer.current = setInterval(() => setRecSecs((s) => s + 1), 1000)
    } catch {
      alert('Microphone not available or permission denied.')
    }
  }

  const stopTracks = () => {
    if (recTimer.current) clearInterval(recTimer.current)
    recTimer.current = null
    recRef.current?.stream.getTracks().forEach((t) => t.stop())
  }

  const cancelRecording = () => {
    const r = recRef.current
    setRecording(false)
    if (!r) return
    r.rec.onstop = () => stopTracks()
    try { r.rec.stop() } catch {}
    recRef.current = null
  }

  const finishRecording = async () => {
    const r = recRef.current
    if (!r) return
    setRecording(false)
    const duration = Math.max(1, Math.round((Date.now() - r.start) / 1000))
    const blob = await new Promise((resolve) => {
      r.rec.onstop = () => {
        stopTracks()
        resolve(new Blob(r.chunks, { type: 'audio/webm' }))
      }
      try { r.rec.stop() } catch { resolve(null) }
    })
    recRef.current = null
    if (!blob || blob.size === 0) return
    const file = new File([blob], `voice-${duration}s.webm`, { type: 'audio/webm' })
    setUpload({ progress: 0 })
    try {
      const media = await uploadToCloudinary(file, (p) => setUpload({ progress: p }))
      await sendMessage(chatId, user.uid, recipientUid, { audio: { url: media.url, duration } })
      notify('🎤 Voice message')
    } catch (err) {
      alert(err.message)
    } finally {
      setUpload(null)
    }
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

      {recording ? (
        <div className="composer recording-bar">
          <button className="icon-btn danger-icon" title="Cancel" onClick={cancelRecording}>
            <IconTrash size={22} />
          </button>
          <div className="rec-info">
            <span className="rec-dot" />
            <div className="rec-wave">
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className="rwbar" style={{ animationDelay: i * 0.07 + 's' }} />
              ))}
            </div>
            <span className="rec-time">{fmt(recSecs)}</span>
          </div>
          <button className="send-btn" title="Send" onClick={finishRecording}>
            <IconSend size={20} />
          </button>
        </div>
      ) : (
        <div className="composer">
          <button
            className="icon-btn"
            onClick={() => setPanel(panel === 'emoji' ? null : 'emoji')}
            title="Emoji"
          ><IconSmile /></button>
          <button
            className={'icon-btn gif-btn' + (panel === 'gif' ? ' active' : '')}
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

          <button className="icon-btn" onClick={() => cameraRef.current?.click()} title="Camera"><IconCamera /></button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />

          <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Photo / Video"><IconPaperclip /></button>
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={pickFile} />

          {text.trim() ? (
            <button
              className="send-btn"
              onClick={send}
              onMouseDown={(e) => e.preventDefault()} // don't blur the textarea
            >
              <IconSend size={20} />
            </button>
          ) : (
            <button className="send-btn mic" onClick={startRecording} title="Record voice">
              <IconMic size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
