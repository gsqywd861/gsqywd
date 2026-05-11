import { fileURLToPath, URL } from 'node:url'
import { rm } from 'fs/promises'
import { resolve } from 'path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    // Remove large WASM files after build (they are served from CDN)
    {
      name: 'remove-wasm',
      closeBundle: async () => {
        const distDir = resolve(process.cwd(), 'dist/assets')
        try {
          const { readdir } = await import('fs/promises')
          const files = await readdir(distDir)
          for (const file of files) {
            if (file.includes('ort-wasm') || file.includes('.wasm')) {
              await rm(resolve(distDir, file))
              console.log(`[remove-wasm] Removed ${file}`)
            }
          }
        } catch (e) {
          // ignore
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    allowedHosts: ['.monkeycode-ai.online'],
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'onnxruntime-web'],
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
})
