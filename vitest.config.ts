import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/components/layout/ProtectedRoute.tsx',
        'src/services/sicoob/orderService.ts',
        'src/pages/ForbiddenPage.tsx',
        'src/components/search/GlobalSearchPalette.tsx',
        'src/components/search/useGlobalSearch.ts'
      ],
      thresholds: {
        perFile: true,
        autoUpdate: false,
        'src/components/layout/ProtectedRoute.tsx': {
          statements: 75,
          branches: 50,
          functions: 100,
          lines: 75,
        },
        'src/services/sicoob/orderService.ts': {
          statements: 35,
          branches: 70,
          functions: 20,
          lines: 35,
        },
        'src/pages/ForbiddenPage.tsx': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/components/search/GlobalSearchPalette.tsx': {
          statements: 70,
          branches: 45,
          functions: 50,
          lines: 70,
        },
        'src/components/search/useGlobalSearch.ts': {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        }
      }
    }

  }
});
