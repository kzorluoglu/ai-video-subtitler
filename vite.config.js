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
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue'],
          'transformers': ['@xenova/transformers']
        }
      }
    },
    chunkSizeWarningLimit: 3000
  },
  
  // Development server
  server: {
    host: true,
    port: 5173
  },
  
  // Preview server
  preview: {
    host: true,
    port: 4173
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['vue', '@xenova/transformers']
  },
  
  // Important: Set base to '/' for proper model loading
  base: '/',
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
    // Ensure transformers uses correct CDN
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})
