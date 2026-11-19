/**
 * Catraca: o mapa de sazonalidade do BI não pode mostrar número fabricado ao vendedor.
 *
 * Trava quatro regras de `src/hooks/bi/useClientSeasonality.ts`:
 *  1. RPC do histórico do cliente caiu → `isError` com `refetch`, nunca 12 meses zerados
 *     passando por "cliente sem sazonalidade";
 *  2. a consulta do setor é opcional: quando ela cai (RPC ou CRM), o histórico do cliente
 *     continua válido, mas a falha sai marcada em `industryError` — "setor caiu" nunca vira
 *     "setor sem dado";
 *  3. setor legitimamente vazio (nenhuma empresa do ramo) não marca indisponibilidade;
 *  4. amostra curta (<3 meses) não vira pico, insight nem mock — `isMock` só para o cliente
 *     de demonstração.
 *
 * Origem: `tests/hooks/useClientSeasonality.errors.test.ts` da PR #112 (fechada sem merge),
 * reescrito para a API atual da `main` (`fetchIndustryPeerIds` no lugar de `selectCrmStrict`,
 * `resolveSeasonalityResult(data, isLoading, useDemoData)`).
 */
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  fetchIndustryPeerIds: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/crm-db', () => ({ fetchIndustryPeerIds: mocks.fetchIndustryPeerIds }));

import { useClientSeasonality } from '@/hooks/bi/useClientSeasonality';
import { DEMO_CLIENT_ID } from '@/lib/bi/demoClient';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return createElement(QueryClientProvider, { client }, children);
}

/** 3 meses distintos: amostra suficiente (`monthsCovered >= 3`). */
const CLIENT_ROWS = [
  { year: 2026, month: 2, quotes_count: 4, total_revenue: 800, avg_ticket: 200 },
  { year: 2026, month: 5, quotes_count: 2, total_revenue: 400, avg_ticket: 200 },
  { year: 2026, month: 9, quotes_count: 1, total_revenue: 100, avg_ticket: 100 },
];

function rpcPorNome(handlers: {
  client?: { data: unknown; error: unknown };
  industry?: { data: unknown; error: unknown };
}) {
  mocks.rpc.mockImplementation(async (fn: string) => {
    if (fn === 'get_client_seasonality') {
      return handlers.client ?? { data: CLIENT_ROWS, error: null };
    }
    return handlers.industry ?? { data: [], error: null };
  });
}

describe('useClientSeasonality — falhas das fontes reais', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.fetchIndustryPeerIds.mockReset().mockResolvedValue(['empresa-1']);
  });

  it('falha do histórico do cliente vira isError com refetch, não mapa zerado', async () => {
    rpcPorNome({ client: { data: null, error: { message: 'histórico indisponível' } } });

    const { result } = renderHook(
      () => useClientSeasonality('cliente-real', 'Cooperativa'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ message: 'histórico indisponível' });
    expect(result.current.refetch).toBeTypeOf('function');
    // O mapa não pode afirmar sazonalidade: nada de pico/insight sobre fonte caída.
    expect(result.current.hasEnoughData).toBe(false);
    expect(result.current.topClientMonths).toEqual([]);
    expect(result.current.insight).toBeNull();
    expect(result.current.isMock).toBe(false);
  });

  it('preserva o histórico do cliente e marca industryError quando o RPC do setor falha', async () => {
    rpcPorNome({ industry: { data: null, error: { message: 'setor indisponível' } } });

    const { result } = renderHook(
      () => useClientSeasonality('cliente-real', 'Cooperativa'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.hasEnoughData).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.client.find((m) => m.month === 2)?.quotesCount).toBe(4);
    // A falha do setor não pode sair como setor zerado silencioso.
    expect(result.current.industryError).toMatchObject({ message: 'setor indisponível' });
    expect(result.current.topIndustryMonths).toEqual([]);
  });

  it('preserva o histórico do cliente e marca industryError quando o CRM do setor falha', async () => {
    rpcPorNome({});
    mocks.fetchIndustryPeerIds.mockRejectedValue(new Error('CRM indisponível'));

    const { result } = renderHook(
      () => useClientSeasonality('cliente-real', 'Cooperativa'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.hasEnoughData).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.client.find((m) => m.month === 2)?.quotesCount).toBe(4);
    expect(result.current.industryError).toBeInstanceOf(Error);
    expect((result.current.industryError as Error).message).toBe('CRM indisponível');
  });

  it('setor legitimamente vazio não marca indisponibilidade', async () => {
    rpcPorNome({});
    mocks.fetchIndustryPeerIds.mockResolvedValue([]);

    const { result } = renderHook(
      () => useClientSeasonality('cliente-real', 'Cooperativa'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.hasEnoughData).toBe(true));
    expect(result.current.industryError).toBeUndefined();
    expect(result.current.industry).toHaveLength(12);
    expect(result.current.industry.every((m) => m.avgQuotesPerCompany === 0)).toBe(true);
  });

  it('amostra curta não vira pico nem insight para cliente real', async () => {
    rpcPorNome({
      client: {
        data: [
          { year: 2026, month: 2, quotes_count: 4, total_revenue: 800, avg_ticket: 200 },
          { year: 2026, month: 3, quotes_count: 1, total_revenue: 100, avg_ticket: 100 },
        ],
        error: null,
      },
    });

    const { result } = renderHook(
      () => useClientSeasonality('cliente-real', 'Cooperativa'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.monthsCovered).toBe(2));
    expect(result.current.hasEnoughData).toBe(false);
    expect(result.current.isMock).toBe(false);
    expect(result.current.topClientMonths).toEqual([]);
    expect(result.current.nextPeakMonth).toBeNull();
    expect(result.current.insight).toBeNull();
  });

  it('mock existe apenas para o cliente de demonstração', async () => {
    rpcPorNome({});

    const demo = renderHook(() => useClientSeasonality(DEMO_CLIENT_ID, 'Tecnologia'), { wrapper });
    await waitFor(() => expect(demo.result.current.isMock).toBe(true));
    expect(demo.result.current.hasEnoughData).toBe(true);
    // Cliente de demonstração não consulta fonte real.
    expect(mocks.rpc).not.toHaveBeenCalled();

    const real = renderHook(() => useClientSeasonality('cliente-real', 'Tecnologia'), { wrapper });
    await waitFor(() => expect(real.result.current.hasEnoughData).toBe(true));
    expect(real.result.current.isMock).toBe(false);
  });
});
