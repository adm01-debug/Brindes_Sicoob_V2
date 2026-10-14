import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('P0 — desempenho da entrada pública', () => {
  it('não promove TanStack Query para o chunk crítico do login', () => {
    const config = readFileSync('vite.config.ts', 'utf8');

    expect(config).toContain("return 'supabase-vendor'");
    expect(config).toContain("return 'query-vendor'");
    expect(config).not.toMatch(
      /@tanstack[\s\S]{0,160}@supabase[\s\S]{0,160}return ['"]data-vendor['"]/,
    );
  });
});
