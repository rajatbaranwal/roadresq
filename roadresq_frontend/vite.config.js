import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Local backend used by the dev-server proxy (override with DEV_BACKEND_URL)
  const backend = env.DEV_BACKEND_URL || 'http://127.0.0.1:5050'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy all Socket.IO requests to backend
        '/socket.io': {
          target: backend,
          ws: true,            // enable websockets
          changeOrigin: true,  // avoid host header issues
        },
        // Proxy your API routes to backend
        '/api': {
          target: backend,
          changeOrigin: true,
        },
      },
    },
  }
})
