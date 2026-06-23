// Tenor v2 GIF search (Google). Free API key.
const KEY = import.meta.env.VITE_TENOR_API_KEY
const CLIENT = 'pocket_chat'

export async function searchGifs(query, limit = 24) {
  if (!KEY) throw new Error('Tenor is not configured. Set VITE_TENOR_API_KEY in .env')
  const endpoint = query
    ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}`
    : `https://tenor.googleapis.com/v2/featured?`
  const res = await fetch(
    `${endpoint}&key=${KEY}&client_key=${CLIENT}&limit=${limit}&media_filter=tinygif,gif`
  )
  if (!res.ok) throw new Error('Tenor request failed')
  const data = await res.json()
  return (data.results || []).map((r) => ({
    id: r.id,
    preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
    full: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
    desc: r.content_description || 'gif',
  }))
}
