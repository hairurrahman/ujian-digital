import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ganti 'aplikasi-asesmen' dengan nama repo GitHub kamu
// Jika repo bernama hairurrahman.github.io (user site), base = '/'
// Jika repo bernama selain itu, misal 'ujian', base = '/ujian/'
export default defineConfig({
  plugins: [react()],
  base: '/',  // Gunakan '/' jika repo adalah hairurrahman.github.io
})
