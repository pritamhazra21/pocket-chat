// GIPHY GIF search. Free API key from https://developers.giphy.com (instant).
const KEY = import.meta.env.VITE_GIPHY_API_KEY

export async function searchGifs(query, limit = 24) {
  if (!KEY) throw new Error('GIPHY is not configured. Set VITE_GIPHY_API_KEY in .env')
  const base = query
    ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}`
    : `https://api.giphy.com/v1/gifs/trending?`
  const res = await fetch(`${base}&api_key=${KEY}&limit=${limit}&rating=g&bundle=messaging_non_clips`)
  if (!res.ok) throw new Error('GIPHY request failed')
  const data = await res.json()
  return (data.data || []).map((g) => ({
    id: g.id,
    preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url,
    full: g.images?.downsized_medium?.url || g.images?.original?.url,
    desc: g.title || 'gif',
  }))
}
