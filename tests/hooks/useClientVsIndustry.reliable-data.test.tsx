import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientBI: vi.fn(),
  query: vi.fn(),
  isDemoClient: vi.fn(),
}));

vi.mock('@/hooks/bi/useClientBI', () => ({ useClientBI: mocks.clientBI }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.query }));
vi.mock('@/lib/bi/demoClient', () => ({ isDemoClient: mocks.isDemoClient }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@/lib/crm-db', () => ({ selectCrm: vi.fn() }));

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
    ...overrides,
  };
}

describe('useClientVsIndustry — dados confiáveis', () => {
  beforeEach(() => {
    mocks.isDemoClient.mockReset().mockReturnValue(false);
    mocks.clientBI.mockReset().mockReturnValue(clientBI());
    mocks.query.mockReset().mockReturnValue({
      data: { rows: [benchmark], sampleSize: 5 },
      isLoading: false,
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
});
