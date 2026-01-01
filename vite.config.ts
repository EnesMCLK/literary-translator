import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/literary-epub-translator/',
  build: {
    outDir: 'dist',    // Çıktı klasörü dist
    emptyOutDir: true, // Her seferinde temizle
  }
})