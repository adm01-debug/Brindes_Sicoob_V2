import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
    preserveSymlinks: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Alguns ambientes locais mantêm dependências em um armazenamento virtual.
    // Transformar o React Query pelo Vite garante que ele reutilize a mesma
    // instância de React dos componentes e evita falhas espúrias de hooks.
    server: {
      deps: {
        inline: [/@tanstack(?:\+|\/)react-query/],
      },
    },
    // Playwright e Deno têm executores próprios. Coletá-los pelo Vitest gerava
    // centenas de falsos negativos antes de qualquer asserção ser executada.
    exclude: [
      ...configDefaults.exclude,
      'e2e/**',
      'supabase/functions/**/*.test.ts',
      'tests/e2e/rbac-dev-technical-routes.test.ts',
      'tests/scenarios/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/pages/QuoteApprovalPage.tsx',
        'src/components/quotes/QuoteApprovalCard.tsx',
        'src/hooks/useQuoteApprovalToken.ts',
        'src/services/sicoob/fulfillmentService.ts',
        'src/services/sicoob/documentIngestService.ts',
        'src/types/sicoob/orders.ts',
        'src/utils/sicoob/orderFinancials.ts',
        'supabase/functions/sicoob-document-ingest/inspection.ts',
        'supabase/functions/sicoob-document-ingest/scanner.ts',
      ],
      thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
      }

    }

  }
});
