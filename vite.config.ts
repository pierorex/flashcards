import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/flashcards/', // GitHub Pages serves from /<repo>/
  plugins: [
    react(),
    VitePWA({
      // 'prompt', not 'autoUpdate': swapping the app mid-session would be
      // jarring, so the banner asks first.
      registerType: 'prompt',
      manifest: false, // ours lives in public/manifest.webmanifest
      workbox: { globPatterns: ['**/*.{js,css,html,svg,webmanifest}'] },
    }),
  ],
})
