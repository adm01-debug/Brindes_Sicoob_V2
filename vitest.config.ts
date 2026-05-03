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
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/layout/ProtectedRoute.tsx',
        'src/services/sicoob/orderService.ts',
        'src/pages/ForbiddenPage.tsx'
      ],
      thresholds: {
        'src/components/layout/ProtectedRoute.tsx': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/services/sicoob/orderService.ts': {
          statements: 35,
          branches: 20,
          functions: 15,
          lines: 35,
        }
      }
    }
  }
});
