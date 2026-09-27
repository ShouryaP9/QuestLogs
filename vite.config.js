import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'QuestLogs',
        short_name: 'QuestLogs',
        description: 'Turn everyday tasks into completed quests.',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192v5.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-512v5.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
