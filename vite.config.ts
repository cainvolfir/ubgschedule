import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon-32.png', 'icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'UBG Schedule',
        short_name: 'UBG Schedule',
        description: 'Unofficial schedule organizer for Universitas Bumigora students',
        theme_color: '#3b82f6',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'id',
        prefer_related_applications: false,
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/mainpage.png',
            sizes: '1170x2532',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'UBG Schedule App',
          },
        ],
      },
      workbox: {
        // Hash-named build assets only (js/css/fonts/icons). index.html is
        // intentionally EXCLUDED from precache so navigations always hit the
        // network and pick up the newest deploy immediately.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // Disable the auto SPA fallback route (would serve stale cached HTML
        // and shadow the NetworkFirst route below). NetworkFirst keeps
        // freshness online; offline navigations show the network error page.
        navigateFallback: null,
        runtimeCaching: [
          {
            // Navigations: always try network first (fresh deploy), fall back
            // to the last cached HTML when offline.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https?:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-cdn',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
