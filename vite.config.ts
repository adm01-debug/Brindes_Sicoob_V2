import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

/**
 * Vite Configuration - Production Ready
 * 
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  esbuild: {
    // Keep console.warn/error for diagnostics in production
    pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
    drop: mode === 'production' ? ['debugger'] : [],
  },
  
  build: {
    outDir: 'dist',
    sourcemap: mode === 'production' ? false : true,
    minify: 'esbuild',
    target: 'esnext',
    chunkSizeWarningLimit: 600,

    reportCompressedSize: true,
    
    rollupOptions: {
      output: {
        manualChunks(id) {
          // As páginas já usam imports dinâmicos. Forçar diretórios inteiros em
          // chunks únicos reunia toda a administração em 1,5 MB e criava ciclos.
          // O Rollup preserva agora os limites naturais de cada rota.

          // Core React & Router (Shared vendor)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'core-vendor';
          }
          
          // Data & API
          if (id.includes('node_modules/@tanstack/') || id.includes('node_modules/@supabase/') || id.includes('node_modules/supabase')) {
            return 'data-vendor';
          }

          // Charts (Very heavy)
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'charts-vendor';
          }

          // UI & Icons (Radix is fine, lucide is big)
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons-vendor';
          }
          
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-vendor';
          }

          // Utilities (Forms, Dates, PDF, DnD)
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'pdf-vendor';
          }

          if (id.includes('node_modules/date-fns/')) {
            return 'date-vendor';
          }
          
          if (id.includes('node_modules/framer-motion/')) {
            return 'motion-vendor';
          }
        },
      },
    },
  },
  
  server: {
    port: 8080,
    host: "::",
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  
  preview: {
    port: 4173,
    host: true,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}))
