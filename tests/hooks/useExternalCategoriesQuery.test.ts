import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));

import { useCategoriesByIds, type ExternalCategory } from '@/hooks/useExternalCategoriesQuery';

describe('useCategoriesByIds', () => {
  beforeEach(() => mocks.useQuery.mockReset());

  it('não consulta o bridge quando não há categorias selecionadas', () => {
    mocks.useQuery.mockReturnValue({ data: [{ id: 'cat-1', name: 'Canetas' }] });

    expect(useCategoriesByIds([])).toEqual([]);
    expect(mocks.useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('filtra somente as categorias selecionadas e habilita a consulta', () => {
    const categories: ExternalCategory[] = [
      { id: 'cat-1', name: 'Canetas' },
      { id: 'cat-2', name: 'Garrafas' },
    ];
    mocks.useQuery.mockReturnValue({ data: categories });

    expect(useCategoriesByIds(['cat-2'])).toEqual([categories[1]]);
    expect(mocks.useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });
});
