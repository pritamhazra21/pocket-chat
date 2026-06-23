// Free push path: the SENDER's browser calls our Cloudflare Worker right after
// sending a message. The Worker looks up the recipient's FCM tokens and delivers
// the notification. No Firebase Cloud Functions / Blaze plan required.
const ENDPOINT = import.meta.env.VITE_PUSH_ENDPOINT

export async function sendPush({ recipientUid, title, body, chatId }) {
  if (!ENDPOINT) return // push not configured yet — silently skip
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientUid, title, body, chatId }),
    })
  } catch {
    // best-effort; never block the UI on a failed notification
  }
}
