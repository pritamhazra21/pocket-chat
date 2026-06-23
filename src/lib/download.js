// Save a remote media file to the device.
// Cloudinary: inject `fl_attachment` so the server sends it as a download.
// Everything else (e.g. GIPHY gifs): fetch the blob and download that.

function cloudinaryAttachment(url, filename) {
  const flag = filename
    ? `fl_attachment:${encodeURIComponent(filename.replace(/\.[^.]+$/, ''))}`
    : 'fl_attachment'
  return url.replace('/upload/', `/upload/${flag}/`)
}

function triggerDownload(href, filename) {
  const a = document.createElement('a')
  a.href = href
  if (filename) a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function downloadMedia(url, filename) {
  try {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      triggerDownload(cloudinaryAttachment(url, filename), filename)
      return
    }
    const res = await fetch(url)
    const blob = await res.blob()
    const obj = URL.createObjectURL(blob)
    triggerDownload(obj, filename || 'download')
    setTimeout(() => URL.revokeObjectURL(obj), 4000)
  } catch {
    // Last resort: open in a new tab so the user can long-press / save manually.
    window.open(url, '_blank')
  }
}

// Pull all http(s) links out of message text.
const URL_RE = /https?:\/\/[^\s<>"')]+/gi
export function extractLinks(text) {
  if (!text) return []
  return text.match(URL_RE) || []
}
