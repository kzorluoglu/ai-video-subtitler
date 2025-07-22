import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  
  // Production optimizations
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: false, // Disable minification to avoid terser issues
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue'],
          'ffmpeg': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          'transformers': ['@xenova/transformers']
        }
      }
    },
    chunkSizeWarningLimit: 5000 // Increase limit for AI models
  },
  
  // Development server
  server: {
    host: true,
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  
  // Preview server (for production testing)
  preview: {
    host: true,
    port: 4173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    include: ['vue']
  },
  
  // Base URL for deployment
  base: './',
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0')
  }
})
