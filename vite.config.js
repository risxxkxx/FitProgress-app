import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest ни овозможува сопствен src/sw.js (потребен за push нотификации),
      // наместо целосно авто-генерирана Workbox service worker.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Фитнес Трекер',
        short_name: 'Фитнес',
        description: 'Личен фитнес трекер за рекомп',
        theme_color: '#0e0e0e',
        background_color: '#0e0e0e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
      // Забелешка: кеширањето на runtime рути (Google Fonts, Supabase) сега е дефинирано
      // директно во src/sw.js со registerRoute(), бидејќи injectManifest не поддржува
      // workbox.runtimeCaching опцијата од generateSW стратегијата.
    })
  ],
})
