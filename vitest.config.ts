import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        thresholds: {
          statements: 60,
          branches: 60,
          functions: 60,
          lines: 60,
          // Thresholds específicos para caminhos críticos
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
  })
);
