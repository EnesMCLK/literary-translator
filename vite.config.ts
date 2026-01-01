import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './literary-translator/',          // Dosyalar kök dizinde
  base: '/literary-translator/',           // Site kök dizinden çalışacak
  build: {
    outDir: 'dist',    // Çıktı klasörü dist
    emptyOutDir: true, // Her seferinde temizle
  }
})

