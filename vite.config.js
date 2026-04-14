import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/ujian-digital/' : '/', // GitHub Pages saat build, '/' saat dev localhost
}))