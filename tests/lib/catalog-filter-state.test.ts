import { describe, expect, it } from 'vitest';

import { canApplyCatalogFilter } from '@/lib/catalog-filter-state';

describe('canApplyCatalogFilter', () => {
  it('mantém IDs em cache quando um refetch falha', () => {
    expect(canApplyCatalogFilter(true, new Error('falha transitória'), true)).toBe(true);
  });

  it('bloqueia o filtro quando a primeira leitura falha sem dados', () => {
    expect(canApplyCatalogFilter(true, new Error('falha inicial'), false)).toBe(false);
  });

  it('não ativa uma consulta sem seleção', () => {
    expect(canApplyCatalogFilter(false, null, true)).toBe(false);
  });
});
