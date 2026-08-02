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
        home: resolve(__dirname, 'home/index.html'),
        system: resolve(__dirname, 'developer/system/index.html'),
        database: resolve(__dirname, 'developer/db-design/index.html'),
        security: resolve(__dirname, 'developer/security-ops/index.html'),
        runbook: resolve(__dirname, 'developer/host-runbook/index.html'),
        photoExport: resolve(__dirname, 'developer/photo-export/index.html'),
        progress: resolve(__dirname, 'developer/github-progress/index.html'),
        repositoryFiles: resolve(__dirname, 'developer/repository-files/index.html'),
        palette: resolve(__dirname, 'developer/palette/index.html'),
      },
    },
  },
})
