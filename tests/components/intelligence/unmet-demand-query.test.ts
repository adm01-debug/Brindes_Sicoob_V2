import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

import { loadUnmetDemand } from '@/components/intelligence/unmet-demand-query';

function query(data: unknown[], error: unknown = null) {
  return Object.assign(Promise.resolve({ data, error }), {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
  });
}

function row(index: number, createdAt = '2026-10-10T12:00:00.000Z') {
  return {
    id: `busca-${String(index).padStart(4, '0')}`,
    search_term: index === 600 ? '   ' : `Termo ${index % 12}`,
    created_at: createdAt,
  };
}

describe('consulta de demanda reprimida', () => {
  beforeEach(() => vi.clearAllMocks());

  it('agrega integralmente mais de 500 buscas usando cursor estável', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => row(600 - index));
    const firstQuery = query(firstPage);
    const secondQuery = query(Array.from({ length: 101 }, (_, index) => row(100 - index)));
    from.mockReturnValueOnce(firstQuery).mockReturnValueOnce(secondQuery);

    const result = await loadUnmetDemand('2026-10-01T00:00:00.000Z');

    expect(from).toHaveBeenCalledTimes(2);
    expect(firstQuery.select).toHaveBeenCalledWith('id, search_term, created_at');
    expect(firstQuery.eq).toHaveBeenCalledWith('results_count', 0);
    expect(firstQuery.gte).toHaveBeenCalledWith('created_at', '2026-10-01T00:00:00.000Z');
    expect(firstQuery.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(firstQuery.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(firstQuery.limit).toHaveBeenCalledWith(500);
    expect(secondQuery.or).toHaveBeenCalledWith(
      'created_at.lt.2026-10-10T12:00:00.000Z,' +
        'and(created_at.eq.2026-10-10T12:00:00.000Z,id.lt.busca-0101)',
    );
    expect(result.totalLostSearches).toBe(600);
    expect(result.items).toHaveLength(10);
    expect(result.items.every((item) => item.searchCount === 50)).toBe(true);
    expect(result.items.reduce((total, item) => total + item.searchCount, 0)).toBe(500);
  });

  it('rejeita o resultado inteiro quando uma página posterior falha', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => row(600 - index));
    const error = { code: '42501', message: 'acesso negado' };
    from.mockReturnValueOnce(query(firstPage)).mockReturnValueOnce(query([], error));

    await expect(loadUnmetDemand('2026-10-01T00:00:00.000Z')).rejects.toEqual(error);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('interrompe se uma página cheia repetir o mesmo cursor', async () => {
    const fullPage = Array.from({ length: 500 }, (_, index) => row(600 - index));
    from.mockReturnValueOnce(query(fullPage)).mockReturnValueOnce(query(fullPage));

    await expect(loadUnmetDemand('2026-10-01T00:00:00.000Z')).rejects.toThrow(
      'não avançou para o próximo cursor',
    );
  });
});
