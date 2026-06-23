// Cloudflare Worker: send FCM web-push when a user gets a new message.
// Trigger: the sender's browser POSTs { recipientUid, title, body, chatId }.
// Auth to Google: mints an OAuth2 access token from the service-account JSON.
//
// Deploy:
//   cd worker
//   npx wrangler secret put SERVICE_ACCOUNT   (paste the service-account JSON)
//   npx wrangler deploy

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405)

    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ error: 'bad json' }, 400)
    }
    const { recipientUid, title, body, chatId } = payload || {}
    if (!recipientUid) return json({ error: 'recipientUid required' }, 400)

    const sa = JSON.parse(env.SERVICE_ACCOUNT)
    const accessToken = await getAccessToken(sa)

    // 1) read recipient's FCM tokens from Firestore (REST)
    const tokens = await getTokens(sa.project_id, recipientUid, accessToken)
    if (!tokens.length) return json({ sent: 0, reason: 'no tokens' })

    // 2) send to each token via FCM HTTP v1
    let sent = 0
    const dead = []
    for (const token of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: title || 'New message', body: body || '' },
              data: { chatId: chatId || '', url: '/' },
              webpush: { fcmOptions: { link: '/' } },
            },
          }),
        }
      )
      if (res.ok) sent++
      else if (res.status === 404 || res.status === 400) dead.push(token)
    }

    return json({ sent, dead: dead.length })
  },
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

async function getTokens(projectId, uid, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return []
  const doc = await res.json()
  const arr = doc.fields?.fcmTokens?.arrayValue?.values || []
  return arr.map((v) => v.stringValue).filter(Boolean)
}

// ---- Google service-account OAuth2 (JWT bearer grant) via Web Crypto ----
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope:
      'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
  const key = await importKey(sa.private_key)
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  )
  const jwt = `${unsigned}.${b64url(sig)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('token error: ' + JSON.stringify(data))
  return data.access_token
}

async function importKey(pem) {
  const body = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

function b64url(input) {
  let bytes
  if (typeof input === 'string') bytes = new TextEncoder().encode(input)
  else bytes = new Uint8Array(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
