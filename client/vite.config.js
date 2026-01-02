import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. Import this

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 2. Add this here
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000', // Keeps your backend connection working
    }
  }
})