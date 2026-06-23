// Direct unsigned upload from the browser to Cloudinary (no server / no card needed).
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// resourceType: 'image' or 'video'
export async function uploadToCloudinary(file, onProgress) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_* in .env')
  }
  // Cloudinary stores audio under the 'video' resource type.
  const resourceType =
    file.type.startsWith('video') || file.type.startsWith('audio') ? 'video' : 'image'
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)

  // Use XHR so we get upload progress events.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText)
        resolve({
          url: res.secure_url,
          type: resourceType, // 'image' | 'video'
          width: res.width,
          height: res.height,
        })
      } else {
        reject(new Error('Upload failed: ' + xhr.responseText))
      }
    }
    xhr.onerror = () => reject(new Error('Upload network error'))
    xhr.send(form)
  })
}
