import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// OAuth callback URLs use localhost:5174; never silently select a different port.
const proxy = {
  '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: 'localhost', port: 5174, strictPort: true, proxy },
  preview: { proxy },
})
