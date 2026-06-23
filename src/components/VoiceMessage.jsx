import { useEffect, useRef, useState } from 'react'
import { IconMic, IconPause, IconPlay } from './Icons.jsx'

function fmt(s) {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec < 10 ? '0' : ''}${sec}`
}

// Static fake waveform bars (deterministic per render) for a nice look.
const BARS = [6, 11, 16, 9, 14, 20, 12, 7, 17, 10, 22, 8, 13, 18, 9, 15, 6, 12, 19, 10]

export default function VoiceMessage({ url, duration }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const [cur, setCur] = useState(0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => {
      setCur(a.currentTime)
      if (a.duration) setProgress(a.currentTime / a.duration)
    }
    const onEnd = () => {
      setPlaying(false)
      setProgress(0)
      setCur(0)
    }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play()
      setPlaying(true)
    }
  }

  return (
    <div className="voice">
      <button className="voice-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
      </button>

      <div className="voice-wave">
        {BARS.map((h, i) => (
          <span
            key={i}
            className={'wbar' + (i / BARS.length <= progress ? ' on' : '')}
            style={{ height: h + 'px' }}
          />
        ))}
      </div>

      <div className="voice-meta">
        <IconMic size={13} />
        <span>{playing || cur ? fmt(cur) : fmt(duration)}</span>
      </div>

      <audio ref={audioRef} src={url} preload="metadata" />
    </div>
  )
}
