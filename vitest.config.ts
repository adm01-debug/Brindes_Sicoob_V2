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
        'src/lib/connection-error-copy.ts',
        'src/lib/error-kind-inference.ts',
        'src/utils/price-freshness.ts'
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
