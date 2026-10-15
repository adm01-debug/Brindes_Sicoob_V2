import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
import {
  loadProductViewActivity,
  loadTrendsActivity,
} from '../../src/pages/trends/trends-queries';

function query(data: unknown[], error: unknown = null) {
  return Object.assign(Promise.resolve({ data, error }), {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
  });
}

function productRow(index: number, createdAt = '2026-09-22T12:00:00.000Z') {
  return {
    id: `produto-${String(index).padStart(4, '0')}`,
    product_id: `produto-${index}`,
    product_name: `Produto ${index}`,
    product_sku: `SKU-${index}`,
    seller_id: 'vendedor',
    view_type: 'detail',
    created_at: createdAt,
  };
}

function searchRow(index: number, createdAt = '2026-09-22T12:00:00.000Z') {
  return {
    id: `busca-${String(index).padStart(4, '0')}`,
    search_term: `busca ${index}`,
    results_count: index,
    user_id: 'vendedor',
    created_at: createdAt,
  };
}

describe('consultas de tendências', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filtra cada evento pela coluna de autoria observada no banco', async () => {
    const views = query([productRow(1)]);
    const searches = query([searchRow(1)]);
    from.mockImplementation((table) => table === 'product_views' ? views : searches);
    const result = await loadTrendsActivity('2026-09-01', 'vendedor');
    expect(views.eq).toHaveBeenCalledWith('seller_id', 'vendedor');
    expect(searches.eq).toHaveBeenCalledWith('user_id', 'vendedor');
    expect(searches.select).toHaveBeenCalledWith(
      'id, search_term, results_count, user_id, created_at',
    );
    expect(views.gte).toHaveBeenCalledWith('created_at', '2026-09-01');
    expect(searches.gte).toHaveBeenCalledWith('created_at', '2026-09-01');
    expect(views.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(views.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(views.limit).toHaveBeenCalledWith(1000);
    expect(result.views).toHaveLength(1);
    expect(result.searches).toHaveLength(1);
  });

  it('carrega todas as páginas das duas fontes e não duplica eventos', async () => {
    const firstViews = Array.from({ length: 1000 }, (_, index) => productRow(index));
    const firstSearches = Array.from({ length: 1000 }, (_, index) => searchRow(index));
    const viewQueries = [
      query(firstViews),
      query([
        firstViews[firstViews.length - 1]!,
        productRow(1000, '2026-09-21T12:00:00.000Z'),
      ]),
    ];
    const searchQueries = [
      query(firstSearches),
      query([
        firstSearches[firstSearches.length - 1]!,
        searchRow(1000, '2026-09-21T12:00:00.000Z'),
      ]),
    ];
    from.mockImplementation((table) =>
      table === 'product_views' ? viewQueries.shift() : searchQueries.shift(),
    );

    const result = await loadTrendsActivity('2026-09-01', null);

    expect(result.views).toHaveLength(1001);
    expect(result.searches).toHaveLength(1001);
    expect(new Set(result.views.map((row) => row.id)).size).toBe(1001);
    expect(new Set(result.searches.map((row) => row.id)).size).toBe(1001);
    expect(from).toHaveBeenCalledTimes(4);
    expect(viewQueries).toHaveLength(0);
    expect(searchQueries).toHaveLength(0);
  });

  it('usa o último par created_at/id como cursor da página seguinte', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => productRow(index));
    const firstQuery = query(firstPage);
    const secondQuery = query([]);
    from.mockReturnValueOnce(firstQuery).mockReturnValueOnce(secondQuery);

    await loadProductViewActivity('2026-09-01', null);

    expect(secondQuery.or).toHaveBeenCalledWith(
      'created_at.lt.2026-09-22T12:00:00.000Z,'
        + 'and(created_at.eq.2026-09-22T12:00:00.000Z,id.lt.produto-0999)',
    );
  });

  it('interrompe com erro se o backend repetir uma página cheia sem avançar o cursor', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => productRow(index));
    from.mockReturnValueOnce(query(fullPage)).mockReturnValueOnce(query(fullPage));

    await expect(loadProductViewActivity('2026-09-01', null)).rejects.toThrow(
      'não avançou para o próximo cursor',
    );
  });

  it('preserva a visão agregada e propaga falhas sem inventar totais zero', async () => {
    const views = query([]);
    const error = { code: '42501' };
    const searches = query([], error);
    from.mockImplementation((table) => table === 'product_views' ? views : searches);
    await expect(loadTrendsActivity('2026-09-01', null)).rejects.toEqual(error);
    expect(views.eq).not.toHaveBeenCalled();
    expect(searches.eq).not.toHaveBeenCalled();
  });
});
