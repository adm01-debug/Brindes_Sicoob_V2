import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '../../src') } },
  test: {
    environment: 'jsdom',
    include: ['scripts/revisao/lacunas-20260928.cenarios.tsx'],
  },
});
