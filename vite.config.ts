import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: {
          router: ['react-router-dom'],
          icons: ['lucide-react'],
          store: ['zustand'],
        },
      },
    },
  },
})
