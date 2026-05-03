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
        'src/hooks/useOrders.ts',
        'src/hooks/useOrderExtensions.ts',
        'src/hooks/useNotificationPreferences.ts',
        'src/hooks/useExportJobs.ts',
        'src/utils/orderExportUtils.ts'
      ],
      thresholds: {
        global: {
          statements: 60,
          branches: 50,
          functions: 60,
          lines: 60,
        }
      }
    }

  }
});
