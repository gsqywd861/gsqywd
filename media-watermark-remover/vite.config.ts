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
        const distDir = resolve(process.cwd(), 'dist')
        try {
          const { readdir, stat } = await import('fs/promises')
          const { join } = await import('path')
          
          async function removeWasmFiles(dir: string) {
            const files = await readdir(dir)
            for (const file of files) {
              const filePath = join(dir, file)
              const stats = await stat(filePath)
              
              if (stats.isDirectory()) {
                await removeWasmFiles(filePath)
              } else if (file.includes('.wasm') || file.includes('ort-wasm')) {
                await rm(filePath)
                console.log(`[remove-wasm] Removed ${file}`)
              }
            }
          }
          
          await removeWasmFiles(distDir)
        } catch (e) {
          console.log('[remove-wasm] Error:', e)
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
