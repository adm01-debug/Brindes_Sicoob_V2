/**
 * Catraca de dado confiável no comparativo Cliente × Setor (hook).
 *
 * Regra travada: o BI não pode mostrar número fabricado ao vendedor.
 *  1. `isMock` é só do cliente de demonstração — cliente real sem histórico ou
 *     sem amostra de ramo nunca sai carimbado como simulado;
 *  2. falha de fonte (histórico do cliente ou CRM do ramo) vira `isError` com
 *     retry, nunca zero silencioso nem "setor sem benchmark";
 *  3. amostra insuficiente (< MIN_SAMPLE) não vira métrica nem insight;
 *  4. o retry refaz as duas fontes, não só o benchmark.
 *
 * Recuperado de `tests/hooks/useClientVsIndustry.reliable-data.test.tsx` da
 * PR #112 (fechada sem merge) e reescrito contra a API atual da `main`: o
 * benchmark resolve os pares do ramo por `fetchIndustryPeerIds`, não mais por
 * `selectCrmStrict`, e aqui o React Query roda de verdade em vez de mockado.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useClientBI: vi.fn(),
  fetchIndustryPeerIds: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/hooks/bi/useClientBI', () => ({ useClientBI: mocks.useClientBI }));
vi.mock('@/lib/crm-db', () => ({ fetchIndustryPeerIds: mocks.fetchIndustryPeerIds }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));

import { useClientVsIndustry } from '@/hooks/bi/useClientVsIndustry';
import { DEMO_CLIENT_ID } from '@/lib/bi/demoClient';
import type { ClientBI } from '@/hooks/bi/useClientBI';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Cliente sem histórico medido: nenhum pedido e nenhuma falha de consulta. */
function clientBI(overrides: Partial<ClientBI> = {}): ClientBI {
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
  } as ClientBI;
}

/** Cliente com pedidos medidos, acima da média do ramo usada no benchmark. */
function clientBIComHistorico(overrides: Partial<ClientBI> = {}): ClientBI {
  return clientBI({
    hasData: true,
    ltv: 80_000,
    avgTicket: 8_000,
    ordersCount: 20,
    recentOrders: [{ itemsCount: 4 }] as ClientBI['recentOrders'],
    ...overrides,
  });
}

function benchmarkRow(totalClientsSampled: number) {
  return {
    total_clients_sampled: totalClientsSampled,
    avg_ltv: 40_000,
    avg_ticket: 4_000,
    avg_quotes_per_client: 10,
    avg_items_per_quote: 2,
    top_product_name: null,
    total_revenue: 200_000,
  };
}

describe('useClientVsIndustry — dados confiáveis', () => {
  beforeEach(() => {
    mocks.useClientBI.mockReset().mockReturnValue(clientBI());
    mocks.fetchIndustryPeerIds.mockReset().mockResolvedValue(['peer-1', 'peer-2', 'peer-3', 'peer-4', 'peer-5']);
    mocks.rpc.mockReset().mockResolvedValue({ data: [benchmarkRow(5)], error: null });
  });

  it('cliente real sem histórico não vira simulado nem desempenho zero contra o setor', async () => {
    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({
      isMock: false,
      hasClientData: false,
      isClientDataUnavailable: false,
      isError: false,
      metrics: [],
      insight: null,
    });
  });

  it('distingue indisponibilidade técnica do histórico de ausência legítima de pedidos', async () => {
    mocks.useClientBI.mockReturnValue(clientBI({ isUnavailable: true, error: new Error('histórico fora do ar') }));

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isClientDataUnavailable).toBe(true);
    expect(result.current.isError).toBe(true);
    expect(result.current.isMock).toBe(false);
    expect(result.current.metrics).toEqual([]);
  });

  it('calcula métricas somente quando cliente e amostra do ramo têm dado medido', async () => {
    mocks.useClientBI.mockReturnValue(clientBIComHistorico());

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'), { wrapper });

    await waitFor(() => expect(result.current.hasEnoughSample).toBe(true));
    expect(result.current.hasClientData).toBe(true);
    expect(result.current.metrics).toHaveLength(4);
    expect(result.current.metrics[0]).toMatchObject({ label: 'LTV', classification: 'above' });
    expect(result.current.sampleSize).toBe(5);
  });

  it('amostra insuficiente do ramo não vira métrica, insight nem selo de simulado', async () => {
    mocks.useClientBI.mockReturnValue(clientBIComHistorico());
    mocks.fetchIndustryPeerIds.mockResolvedValue(['peer-1', 'peer-2']);
    mocks.rpc.mockResolvedValue({ data: [benchmarkRow(2)], error: null });

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasEnoughSample).toBe(false);
    expect(result.current.metrics).toEqual([]);
    expect(result.current.insight).toBeNull();
    expect(result.current.isMock).toBe(false);
  });

  it('CRM do ramo fora do ar vira erro com retry, não amostra zero silenciosa', async () => {
    mocks.useClientBI.mockReturnValue(clientBIComHistorico());
    mocks.fetchIndustryPeerIds.mockRejectedValue(new Error('CRM indisponível ou sem credenciais válidas'));

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.metrics).toEqual([]);
    expect(result.current.hasEnoughSample).toBe(false);
    expect(result.current.isMock).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('RPC do benchmark que falha vira erro, não setor sem referência', async () => {
    mocks.useClientBI.mockReturnValue(clientBIComHistorico());
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('benchmark indisponível') });

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.metrics).toEqual([]);
    expect(result.current.insight).toBeNull();
  });

  it('retry refaz histórico do cliente e benchmark do ramo', async () => {
    const refetchHistorico = vi.fn(async () => undefined);
    mocks.useClientBI.mockReturnValue(clientBIComHistorico({ refetch: refetchHistorico }));

    const { result } = renderHook(() => useClientVsIndustry('cliente-real', 'Cooperativa'), { wrapper });

    await waitFor(() => expect(result.current.hasEnoughSample).toBe(true));
    mocks.fetchIndustryPeerIds.mockClear();
    await result.current.refetch();

    expect(refetchHistorico).toHaveBeenCalledOnce();
    await waitFor(() => expect(mocks.fetchIndustryPeerIds).toHaveBeenCalled());
  });

  it('mock de benchmark fica restrito ao cliente de demonstração e não toca no CRM', async () => {
    mocks.useClientBI.mockReturnValue(clientBIComHistorico({ isMock: true }));

    const { result } = renderHook(() => useClientVsIndustry(DEMO_CLIENT_ID, 'Tecnologia'), { wrapper });

    await waitFor(() => expect(result.current.hasEnoughSample).toBe(true));
    expect(result.current.isMock).toBe(true);
    expect(mocks.fetchIndustryPeerIds).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
