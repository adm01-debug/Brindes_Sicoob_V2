import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Playwright e Deno têm executores próprios. Coletá-los pelo Vitest gerava
    // centenas de falsos negativos antes de qualquer asserção ser executada.
    exclude: [
      ...configDefaults.exclude,
      'e2e/**',
      'supabase/functions/**/*.test.ts',
      'tests/e2e/rbac-dev-technical-routes.test.ts',
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
