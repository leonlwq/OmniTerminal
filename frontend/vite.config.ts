import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@xterm/addon-ligatures': '@xterm/addon-ligatures/lib/addon-ligatures.mjs'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'xterm-vendor': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-search', '@xterm/addon-webgl'],
          'lucide-icons': ['lucide-react']
        }
      }
    }
  }
})
