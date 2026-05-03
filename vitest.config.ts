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
      thresholds: {
        'src/components/layout/ProtectedRoute.tsx': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/services/sicoob/orderService.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        }
      }
    }
  }
});
