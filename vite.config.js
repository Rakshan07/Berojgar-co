import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Same-origin API requests work even when Vite selects another available port.
const proxy = {
  '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, proxy },
  preview: { port: 5174, proxy },
})
