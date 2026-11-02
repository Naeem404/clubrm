/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
// Same handlers the Vercel functions in api/ use — no duplicated logic.
import { handleBriefRequest, handleStatsRequest } from './api/_lib/handlers.js'

/** Serves the api/ functions during `vite dev` so local dev matches Vercel. */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0]
        if (pathname === '/api/dashboard/stats' || pathname === '/api/stats') {
          void handleStatsRequest(req, res, env)
          return
        }
        if (pathname === '/api/brief') {
          void handleBriefRequest(req, res, env)
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL env vars (no prefix filter) for the dev API only — they are never
  // exposed to the client bundle, which still only sees VITE_* via import.meta.env.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') } as Record<string, string>

  return {
    plugins: [react(), tailwindcss(), devApi(env)],
    server: {
      allowedHosts: ['.ngrok-free.dev'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true, 
      environment: 'happy-dom',
      include: ['test/**/*.test.{ts,tsx}'],
      setupFiles: ['./test/setup.ts'],
      server: {
        deps: {
          inline: [/html-encoding-sniffer/, /@exodus\/bytes/],
        },
      },
    },
  }
})
