import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('react-dom') || id.includes('scheduler')) {
            return 'react-dom'
          }

          if (id.includes('react-router-dom') || id.includes('react-router') || id.includes('@remix-run')) {
            return 'router'
          }

          if (id.includes('react-i18next') || id.includes('i18next')) {
            return 'i18n'
          }

          if (id.includes('@supabase')) {
            return 'supabase'
          }

          if (id.includes('stripe')) {
            return 'stripe'
          }

          if (id.includes('react-icons')) {
            return 'icons'
          }

          if (id.includes('tus-js-client')) {
            return 'tus'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4242',
    },
  },
})
