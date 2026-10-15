import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientBI: vi.fn(),
  query: vi.fn(),
  isDemoClient: vi.fn(),
  selectCrmStrict: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/hooks/bi/useClientBI', () => ({ useClientBI: mocks.clientBI }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.query }));
vi.mock('@/lib/bi/demoClient', () => ({ isDemoClient: mocks.isDemoClient }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/crm-db', () => ({ selectCrmStrict: mocks.selectCrmStrict }));

import { useClientVsIndustry } from '@/hooks/bi/useClientVsIndustry';

const benchmark = {
  total_clients_sampled: 5,
  avg_ltv: 40_000,
  avg_ticket: 4_000,
  avg_quotes_per_client: 10,
  avg_items_per_quote: 2,
  top_product_name: null,
  total_revenue: 200_000,
};

function clientBI(overrides: Record<string, unknown> = {}) {
  return {
    isMock: false,
    hasData: false,
    isUnavailable: false,
    ltv: 0,
    avgTicket: 0,
    ordersCount: 0,
    lastOrderDate: null,
    daysSinceLastOrder: null,
    topCategories: [],
    recentOrders: [],
    current90d: { ltv: 0, avgTicket: 0, ordersCount: 0 },
    previous90d: { ltv: 0, avgTicket: 0, ordersCount: 0 },
    delta: { ltvDeltaPct: 0, avgTicketDeltaPct: 0, ordersCountDeltaPct: 0, hasPreviousData: false },
    isLoading: false,
    error: null,
    refetch: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('useClientVsIndustry — dados confiáveis', () => {
  beforeEach(() => {
    mocks.isDemoClient.mockReset().mockReturnValue(false);
    mocks.clientBI.mockReset().mockReturnValue(clientBI());
    mocks.selectCrmStrict.mockReset().mockResolvedValue([]);
    mocks.rpc.mockReset();
    mocks.query.mockReset().mockReturnValue({
      data: { rows: [benchmark], sampleSize: 5 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(async () => undefined),
    });
  });

  it('não transforma cliente sem histórico em desempenho zero contra o setor', () => {
    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'));

    expect(result.current).toMatchObject({
      isMock: false,
      hasClientData: false,
      isClientDataUnavailable: false,
      hasEnoughSample: true,
      metrics: [],
      insight: null,
    });
  });

  it('distingue indisponibilidade técnica de ausência legítima de pedidos', () => {
    mocks.clientBI.mockReturnValue(clientBI({ isUnavailable: true }));

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'));

    expect(result.current.isClientDataUnavailable).toBe(true);
    expect(result.current.metrics).toEqual([]);
  });

  it('calcula métricas somente quando cliente e amostra possuem dados', () => {
    mocks.clientBI.mockReturnValue(clientBI({
      hasData: true,
      ltv: 50_000,
      avgTicket: 5_000,
      ordersCount: 12,
      recentOrders: [{ itemsCount: 3 }],
    }));

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'));

    expect(result.current.hasClientData).toBe(true);
    expect(result.current.metrics).toHaveLength(4);
    expect(result.current.metrics[0]).toMatchObject({ label: 'LTV', classification: 'above' });
  });

  it('faz o queryFn rejeitar quando a leitura estrita informa indisponibilidade do CRM', async () => {
    const sourceError = new Error('CRM indisponível ou sem credenciais válidas');
    let queryFn: (() => Promise<unknown>) | undefined;
    mocks.selectCrmStrict.mockRejectedValueOnce(sourceError);
    mocks.query.mockImplementationOnce((options: { queryFn: () => Promise<unknown> }) => {
      queryFn = options.queryFn;
      return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(async () => undefined),
      };
    });

    renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'));

    expect(queryFn).toBeDefined();
    await expect(queryFn?.()).rejects.toBe(sourceError);
    expect(mocks.selectCrmStrict).toHaveBeenCalledWith('companies', expect.objectContaining({
      filters: { ramo_atividade: 'Cooperativa', deleted_at: null },
    }));
  });

  it('mantém coleção CRM legitimamente vazia como amostra zero', async () => {
    let queryFn: (() => Promise<unknown>) | undefined;
    mocks.selectCrmStrict.mockResolvedValueOnce([]);
    mocks.query.mockImplementationOnce((options: { queryFn: () => Promise<unknown> }) => {
      queryFn = options.queryFn;
      return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(async () => undefined),
      };
    });

    renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'));

    await expect(queryFn?.()).resolves.toEqual({ rows: [], sampleSize: 0 });
  });

  it('propaga erro do benchmark e refaz histórico e CRM no retry', async () => {
    const sourceError = new Error('CRM indisponível');
    const refetchHistory = vi.fn(async () => undefined);
    const refetchBenchmark = vi.fn(async () => undefined);
    mocks.clientBI.mockReturnValue(clientBI({ refetch: refetchHistory }));
    mocks.query.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: sourceError,
      refetch: refetchBenchmark,
    });

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'));

    expect(result.current).toMatchObject({
      isError: true,
      error: sourceError,
      hasEnoughSample: false,
      sampleSize: 0,
    });
    await result.current.refetch();
    expect(refetchHistory).toHaveBeenCalledOnce();
    expect(refetchBenchmark).toHaveBeenCalledOnce();
  });
});
