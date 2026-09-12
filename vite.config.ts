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

          // Bibliotecas utilizadas apenas em rotas (PDF, gráficos, ícones,
          // Radix, datas e animações) permanecem no particionamento natural
          // do Rollup. Agrupá-las aqui promovia dependências privadas para a
          // entrada pública e fazia o login baixar módulos que não utiliza.
        },
      },
    },
  },
  
  server: {
    port: 8080,
    host: "::",
    watch: {
      // Evidências geradas pelo Playwright não são código-fonte. Observá-las
      // causava recargas da página durante o próprio smoke.
      ignored: [
        '**/e2e-artifacts/**',
        '**/playwright-report/**',
        '**/test-results/**',
        '**/.lighthouseci/**',
        '**/bundle-stats/**',
      ],
    },
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
