import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Project Pages URL: https://1mukeshr.github.io/pahadlink/
const PAGES_BASE = '/pahadlink/'

export default defineConfig(({ command }) => ({
  // Absolute base avoids broken asset URLs on GitHub Pages.
  base: command === 'build' ? PAGES_BASE : '/',
  plugins: [react()],
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    modulePreload: { polyfill: true },
  },
  server: {
    // Bind all NICs so any LAN/Wi‑Fi client can open http://<this-pc-ip>:5173
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
    // Same /api proxy as dev so `npm run preview` works with local API
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
}))
