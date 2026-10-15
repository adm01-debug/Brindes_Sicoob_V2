import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from, rpc } }));
import {
  loadProductViewActivity,
  loadTrendsCapabilities,
  loadTrendsActivity,
  resolveTrendsDataAccess,
} from '../../src/pages/trends/trends-queries';
import {
  buildCivilTrendWindow,
  buildTrendsSnapshot,
  formatDateKey,
} from '../../src/pages/trends/trends-projections';

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

  it('alinha as janelas aos dias civis, incluindo o dia atual', () => {
    const window = buildCivilTrendWindow(new Date(2026, 9, 15, 15, 30), 7);
    const localParts = (value: string) => {
      const date = new Date(value);
      return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()];
    };

    expect(localParts(window.sinceCurrent)).toEqual([2026, 10, 9, 0]);
    expect(localParts(window.sincePrevious)).toEqual([2026, 10, 2, 0]);
    expect(localParts(window.recentCutoff)).toEqual([2026, 10, 14, 0]);
    expect(formatDateKey('2026-10-15')).toBe('15/10');
  });

  it.each([
    ['admin', true, true, 'all', null],
    ['manager', false, true, 'self', 'usuario-1'],
    ['vendedor', false, true, 'self', 'usuario-1'],
    ['dev', false, true, 'self', 'usuario-1'],
    ['supervisor', false, true, 'self', 'usuario-1'],
    ['gestor_compras', false, true, 'self', 'usuario-1'],
    ['comprador_singular', false, true, 'self', 'usuario-1'],
  ])(
    'alinha o papel %s às capacidades comprovadas pela RLS',
    async (_role, isAdmin, canReadSearchAnalytics, mode, sellerScope) => {
      rpc.mockResolvedValue({ data: isAdmin, error: null });

      const capabilities = await loadTrendsCapabilities('usuario-1');
      const access = resolveTrendsDataAccess('usuario-1', capabilities);

      expect(access).toEqual({ mode, sellerScope });
      expect(capabilities.canReadSearchAnalytics).toBe(canReadSearchAnalytics);
      expect(rpc).toHaveBeenCalledWith('has_role', {
        _user_id: 'usuario-1',
        _role: 'admin',
      });
      expect(rpc).toHaveBeenCalledTimes(1);
    },
  );

  it('filtra cada evento pela coluna de autoria observada no banco', async () => {
    const views = query([productRow(1)]);
    const searches = query([searchRow(1)]);
    from.mockImplementation((table) => (table === 'product_views' ? views : searches));
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
      query([firstViews[firstViews.length - 1]!, productRow(1000, '2026-09-21T12:00:00.000Z')]),
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

  it('deriva rankings, série e KPIs da mesma carga completa acima de mil eventos', async () => {
    const views = Array.from({ length: 1001 }, (_, index) => ({
      ...productRow(index),
      product_id: 'produto-unico',
      product_name: 'Produto único',
    }));
    const searches = Array.from({ length: 1001 }, (_, index) => ({
      ...searchRow(index),
      search_term: 'Busca única',
    }));
    const viewQueries = [query(views.slice(0, 1000)), query(views.slice(1000))];
    const searchQueries = [query(searches.slice(0, 1000)), query(searches.slice(1000))];
    from.mockImplementation((table) =>
      table === 'product_views' ? viewQueries.shift() : searchQueries.shift(),
    );

    const activity = await loadTrendsActivity('2026-09-01', null);
    const snapshot = buildTrendsSnapshot(activity, {
      sinceCurrent: '2026-09-15T00:00:00.000Z',
      recentCutoff: '2026-09-20T00:00:00.000Z',
      days: 7,
      referenceDate: new Date('2026-09-22T12:00:00.000Z'),
    });

    expect(from).toHaveBeenCalledTimes(4);
    expect(snapshot.products[0]).toMatchObject({ id: 'produto-unico', views: 1001 });
    expect(snapshot.searches.current[0]).toMatchObject({ term: 'busca única', count: 1001 });
    expect(snapshot.daily.current.find((row) => row.date === '2026-09-22')).toMatchObject({
      views: 1001,
      searches: 1001,
    });
    expect(snapshot.kpi.current).toEqual({
      totalViews: 1001,
      totalSearches: 1001,
      uniqueProducts: 1,
      uniqueSearches: 1,
    });
  });

  it('deriva sinais de mercado da carga completa sem o antigo corte de duas mil linhas', () => {
    const currentViews = Array.from({ length: 2501 }, (_, index) => ({
      ...productRow(index),
      product_name: 'Caneca Premium',
    }));
    const currentSearches = Array.from({ length: 2501 }, (_, index) => ({
      ...searchRow(index),
      search_term: 'Caneca Sicoob',
      results_count: 5,
    }));
    const previousSearches = Array.from({ length: 500 }, (_, index) => ({
      ...searchRow(index + 3000, '2026-09-10T12:00:00.000Z'),
      search_term: 'Caneca Sicoob',
      results_count: 5,
    }));

    const snapshot = buildTrendsSnapshot(
      { views: currentViews, searches: [...currentSearches, ...previousSearches] },
      {
        sinceCurrent: '2026-09-15T00:00:00.000Z',
        recentCutoff: '2026-09-20T00:00:00.000Z',
        days: 7,
        referenceDate: new Date('2026-09-22T12:00:00.000Z'),
      },
    );

    expect(snapshot.hotSearches.items[0]).toMatchObject({
      term: 'caneca sicoob',
      searchCount: 2501,
      previousCount: 500,
      delta: 400,
    });
    expect(snapshot.hotSearches.totalSearches).toBe(2501);
    expect(snapshot.topCategories[0]).toMatchObject({ category: 'Caneca', views: 2501 });
    expect(snapshot.heatmap.max).toBe(5002);
  });

  it('mantém no selo o total global quando há mais termos que o top 10', () => {
    const searches = Array.from({ length: 12 }, (_, index) => ({
      ...searchRow(index),
      search_term: `termo ${index}`,
      results_count: 1,
    }));

    const snapshot = buildTrendsSnapshot(
      { views: [], searches },
      {
        sinceCurrent: '2026-09-15T00:00:00.000Z',
        recentCutoff: '2026-09-20T00:00:00.000Z',
        days: 7,
        referenceDate: new Date('2026-09-22T12:00:00.000Z'),
      },
    );

    expect(snapshot.hotSearches.items).toHaveLength(10);
    expect(snapshot.hotSearches.totalSearches).toBe(12);
  });

  it('normaliza espaços e caixa ao calcular buscas únicas dos KPIs', () => {
    const searches = [
      { ...searchRow(1), search_term: ' Caneca Sicoob ' },
      { ...searchRow(2), search_term: 'caneca sicoob' },
    ];

    const snapshot = buildTrendsSnapshot(
      { views: [], searches },
      {
        sinceCurrent: '2026-09-15T00:00:00.000Z',
        recentCutoff: '2026-09-20T00:00:00.000Z',
        days: 7,
        referenceDate: new Date('2026-09-22T12:00:00.000Z'),
      },
    );

    expect(snapshot.kpi.current.uniqueSearches).toBe(1);
  });

  it('calcula a base do ranking dentro do período atual sem misturar o período anterior', () => {
    const currentRecent = {
      ...productRow(1, '2026-09-25T12:00:00.000Z'),
      product_id: 'produto-unico',
    };
    const currentBaseline = {
      ...productRow(2, '2026-09-10T12:00:00.000Z'),
      product_id: 'produto-unico',
    };
    const previousPeriod = {
      ...productRow(3, '2026-08-25T12:00:00.000Z'),
      product_id: 'produto-unico',
    };

    const snapshot = buildTrendsSnapshot(
      { views: [currentRecent, currentBaseline, previousPeriod], searches: [] },
      {
        sinceCurrent: '2026-09-01T00:00:00.000Z',
        recentCutoff: '2026-09-20T00:00:00.000Z',
        days: 30,
        referenceDate: new Date('2026-09-30T12:00:00.000Z'),
      },
    );

    expect(snapshot.products[0]).toMatchObject({
      id: 'produto-unico',
      views: 2,
      recentViews: 1,
      baselineViews: 1,
      classification: 'rising',
    });
  });

  it('usa o último par created_at/id como cursor da página seguinte', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => productRow(index));
    const firstQuery = query(firstPage);
    const secondQuery = query([]);
    from.mockReturnValueOnce(firstQuery).mockReturnValueOnce(secondQuery);

    await loadProductViewActivity('2026-09-01', null);

    expect(secondQuery.or).toHaveBeenCalledWith(
      'created_at.lt.2026-09-22T12:00:00.000Z,' +
        'and(created_at.eq.2026-09-22T12:00:00.000Z,id.lt.produto-0999)',
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
    from.mockImplementation((table) => (table === 'product_views' ? views : searches));
    await expect(loadTrendsActivity('2026-09-01', null)).rejects.toEqual(error);
    expect(views.eq).not.toHaveBeenCalled();
    expect(searches.eq).not.toHaveBeenCalled();
  });
});
