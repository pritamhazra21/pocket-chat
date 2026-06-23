import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// We use `injectManifest` so a SINGLE service worker handles BOTH:
//   - Workbox offline caching / install-to-homescreen
//   - Firebase Cloud Messaging background push
// The custom SW lives at src/sw.js
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Pocket Chat',
        short_name: 'Chat',
        description: 'A simple 1:1 chat app',
        theme_color: '#0b141a',
        background_color: '#0b141a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // expose on LAN so you can test from your phone
  },
})
