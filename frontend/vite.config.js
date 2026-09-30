import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Only the production build is emitted under /build/. The dev server keeps
  // the root base so its own module URLs stay at the origin, which is what the
  // strictPort origin in the browser expects.
  base: command === 'build' ? '/build/' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    // Written straight into Laravel's public/build so `php artisan serve` can
    // serve the site from one origin, with no copy step that could forget to
    // preserve the front controller. That path is already gitignored, so build
    // output never reaches the repository.
    outDir: fileURLToPath(new URL('../backend/public/build', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    // Pinned rather than left to Vite's "next free port" behaviour. When the
    // port is already taken Vite silently increments, so the URL in the
    // terminal stops matching the one in the browser and the API proxy ends up
    // pointed at a stale origin. strictPort makes the collision a hard, obvious
    // failure instead.
    port: Number(process.env.FRONTEND_PORT ?? 5173),
    strictPort: true,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? `http://127.0.0.1:${process.env.BACKEND_PORT ?? 8000}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: Number(process.env.PREVIEW_PORT ?? 4173),
    strictPort: true,
  },
}))
