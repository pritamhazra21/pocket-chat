# Pocket Chat 💬

A mobile-first, installable (PWA) 1:1 chat app built on Firebase — free to run, no credit card.

**Features:** Google sign-in · realtime messaging · online/offline presence · typing indicator ·
read receipts (single ✓ sent, double ✓✓ delivered, blue ✓✓ read) · photo & video sharing ·
emoji picker · GIF search (Tenor) · push notifications (even when closed) · add-to-homescreen.

**Stack:** React + Vite + vite-plugin-pwa · Firebase Auth + Firestore + FCM · Cloudinary (media) ·
Tenor (GIFs) · Cloudflare Worker (push sender) · Firebase Hosting.

---

## What you need to create (all free, no card)

| Service | What to grab | Where |
|---|---|---|
| **Firebase** | Web app config (6 values) + Web Push VAPID key | console.firebase.google.com |
| **Cloudinary** | Cloud name + an **unsigned** upload preset | cloudinary.com (free) |
| **Tenor** | API key | console.cloud.google.com (enable "Tenor API") |
| **Cloudflare** | Free account (for the push Worker) | dash.cloudflare.com |

---

## 1. Firebase setup

1. Create a project at https://console.firebase.google.com (Spark/free plan — **do not** upgrade to Blaze).
2. **Authentication** → Sign-in method → enable **Google**.
3. **Firestore Database** → Create database → Start in **production mode** (rules are in `firestore.rules`).
4. **Project settings → General → Your apps →** add a **Web app**. Copy the config values into `.env`.
5. **Project settings → Cloud Messaging → Web configuration →** under *Web Push certificates* click
   **Generate key pair**. Copy that key into `VITE_FIREBASE_VAPID_KEY`.
6. **Project settings → Service accounts → Generate new private key** → download the JSON
   (used by the Cloudflare Worker in step 4 below — keep it secret).

## 2. Cloudinary (photo/video)

1. Sign up at https://cloudinary.com → note your **Cloud name** (Dashboard).
2. Settings → **Upload** → *Upload presets* → **Add unsigned preset**. Save the preset name.
3. Put both into `.env` (`VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`).

## 3. Tenor (GIFs)

1. https://console.cloud.google.com → enable the **Tenor API** → **Create credentials → API key**.
2. Put it in `VITE_TENOR_API_KEY`.

## 4. Configure & run

```bash
cp .env.example .env      # then fill in every value
npm install
npm run dev               # opens on your LAN too (see the Network URL)
```

Open the **Network** URL on your phone (same Wi-Fi) to test on mobile.
> Push notifications require **HTTPS** — they work on the deployed site, and on `localhost`,
> but not over a plain `http://192.168.x.x` LAN address. Use deploy (step 6) to test push on your phone.

## 5. Deploy the push Worker (notifications when app is closed)

```bash
cd worker
npx wrangler login
npx wrangler secret put SERVICE_ACCOUNT   # paste the entire service-account JSON (one line)
npx wrangler deploy
```

Copy the deployed URL (e.g. `https://pocket-chat-push.<you>.workers.dev`) into
`VITE_PUSH_ENDPOINT` in `.env`, then rebuild/redeploy the app.

## 6. Deploy the app (Firebase Hosting, free)

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project
firebase deploy --only firestore:rules    # push security rules
npm run build
firebase deploy --only hosting
```

Add the Hosting domain to **Firebase → Authentication → Settings → Authorized domains**.

## 7. Install on your phone

Open the deployed `https://...web.app` URL on your phone →
- **Android (Chrome):** menu → *Install app* / *Add to Home screen*.
- **iPhone (Safari):** Share → *Add to Home Screen*.
  > iOS only delivers web push to a PWA that's been **installed to the Home Screen** (iOS 16.4+).
  > Open it from the Home Screen icon and allow notifications.

---

## How it fits together

- **Messages / typing / presence** live in **Firestore** and stream in realtime via `onSnapshot`.
- **Media** uploads straight from the browser to **Cloudinary**; only the URL is stored in Firestore.
- **Push:** when you send a message, the app pings the **Cloudflare Worker**, which reads the
  recipient's FCM tokens from Firestore and delivers the notification through **FCM** — the
  recipient's service worker (`src/sw.js`) shows it even if the app is closed.

## Data model (Firestore)

```
users/{uid}            → displayName, email, emailLower, photoURL, online, lastSeen, fcmTokens[]
chats/{chatId}         → participants[2], participantInfo, lastMessage, lastMessageTime, typing{}, lastRead{uid→ts}
chats/{chatId}/messages/{id} → senderId, type(text|image|video|gif), text, media{url,type}, createdAt
```
`chatId` is the two UIDs sorted and joined, so both users resolve to the same chat.

## Notes & possible upgrades

- **Presence** uses a Firestore heartbeat + visibility events. For instant, reliable "offline"
  detection, add **Realtime Database** `onDisconnect()` (also free) — see `src/lib/presence.js`.
- Bundle is ~950 KB (Firebase SDK). Fine for a personal app; code-split later if needed.
- To find people you currently add them **by email** (they must have signed in once).
