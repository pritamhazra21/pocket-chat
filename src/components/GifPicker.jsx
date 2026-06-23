import { useEffect, useRef, useState } from 'react'
import { searchGifs } from '../lib/giphy.js'

export default function GifPicker({ onPick, onClose }) {
  const [q, setQ] = useState('')
  const [gifs, setGifs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef(null)

  const run = async (query) => {
    setLoading(true)
    setError('')
    try {
      setGifs(await searchGifs(query))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run('') // featured on open
  }, [])

  const onType = (val) => {
    setQ(val)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => run(val), 350)
  }

  return (
    <div className="panel gif-panel">
      <div className="panel-head">
        <input
          className="text-input"
          placeholder="Search GIFs"
          value={q}
          onChange={(e) => onType(e.target.value)}
          autoFocus
        />
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      {error && <p className="muted error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}
      <div className="gif-grid">
        {gifs.map((g) => (
          <button key={g.id} className="gif-cell" onClick={() => onPick(g.full)}>
            <img src={g.preview} alt={g.desc} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}
