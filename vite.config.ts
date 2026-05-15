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
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Admin, Quotes, Sicoob — isolando rotas pesadas
          if (id.includes('src/pages/admin/') || id.includes('src/pages/Admin/')) return 'admin-pages';
          if (id.includes('src/pages/quotes/') || id.includes('src/pages/Quotes/')) return 'quotes-pages';
          if (id.includes('src/pages/sicoob/') || id.includes('src/pages/Sicoob/')) return 'sicoob-pages';

          // Core React & Router
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'core-vendor';
          }
          
          // Data & API
          if (id.includes('node_modules/@tanstack/') || id.includes('node_modules/@supabase/') || id.includes('node_modules/supabase')) {
            return 'data-vendor';
          }

          // UI & Icons
          if (id.includes('node_modules/@radix-ui/') || id.includes('node_modules/lucide-react/') || id.includes('node_modules/sonner/')) {
            return 'ui-vendor';
          }

          // Animations
          if (id.includes('node_modules/framer-motion/')) {
            return 'motion-vendor';
          }

          // Utilities (Forms, Dates, Charts, PDF, DnD)
          if (
            id.includes('node_modules/react-hook-form/') || 
            id.includes('node_modules/zod/') ||
            id.includes('node_modules/date-fns/') ||
            id.includes('node_modules/recharts/') ||
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/html2canvas') ||
            id.includes('node_modules/@dnd-kit/')
          ) {
            return 'utils-vendor';
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
