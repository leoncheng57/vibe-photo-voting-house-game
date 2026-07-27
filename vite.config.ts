import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/vibe-photo-voting-house-game/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        system: resolve(__dirname, 'developer/system/index.html'),
      },
    },
  },
})
