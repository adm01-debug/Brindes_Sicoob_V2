import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'node:fs'
import path from 'path'
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

const demoImagePath = path.resolve(__dirname, 'src/assets/demo/produtos-grid-v1.webp')

function demoAssetsPlugin(enabled: boolean): Plugin {
  return {
    name: 'sicoob-demo-assets',
    configureServer(server) {
      if (!enabled) return
      server.middlewares.use('/__demo-assets/produtos-grid-v1.webp', (_req, res) => {
        res.setHeader('Content-Type', 'image/webp')
        res.end(fs.readFileSync(demoImagePath))
      })
    },
    generateBundle() {
      if (!enabled) return
      this.emitFile({
        type: 'asset',
        fileName: 'demo-assets/produtos-grid-v1.webp',
        source: fs.readFileSync(demoImagePath),
      })
    },
  }
}

/**
 * Vite Configuration - Production Ready
 * 
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    demoAssetsPlugin(mode === 'development' || process.env.VITE_ENABLE_DEMO_PAGES === 'true'),
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ].filter(Boolean),

  // A constante literal permite ao Rollup remover por completo as rotas e os
  // ativos demonstrativos do bundle normal. O workflow visual opt-in define
  // VITE_ENABLE_DEMO_PAGES=true e mantém as páginas disponíveis para QA.
  define: {
    __ENABLE_DEMO_PAGES__: JSON.stringify(
      mode === 'development' || process.env.VITE_ENABLE_DEMO_PAGES === 'true',
    ),
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // O layout híbrido npm/Deno cria links físicos distintos para os peers de
    // algumas dependências. Sem deduplicação, o bundle de produção pode conter
    // duas instâncias do React e quebrar hooks ao carregar o aplicativo interno.
    dedupe: ['react', 'react-dom'],
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
          
          // O login precisa do cliente Supabase, mas não do TanStack Query usado
          // no aplicativo interno. Mantê-los no mesmo chunk fazia a entrada
          // pública baixar dezenas de KiB de código sem uso antes do LCP.
          if (id.includes('node_modules/@supabase/') || id.includes('node_modules/supabase')) {
            return 'supabase-vendor';
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'query-vendor';
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
