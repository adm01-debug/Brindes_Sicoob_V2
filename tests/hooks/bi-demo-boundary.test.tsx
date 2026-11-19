/**
 * Fronteira entre dado real e modo de demonstração do BI.
 *
 * Regra travada: o BI não pode mostrar número fabricado ao vendedor. O conjunto
 * simulado é exclusivo do cliente de demonstração (`isDemoClient`); para
 * qualquer cliente real, fonte que respondeu sem linha medida vira estado vazio
 * explícito (`isMock: false`, listas vazias) — nunca mock, nunca número inventado.
 *
 * Recuperado de `tests/hooks/bi-demo-boundary.test.tsx` da PR #112 (fechada sem
 * merge) e reescrito contra a API atual da `main`: as fontes do setor passaram a
 * usar `fetchIndustryPeerIds` (contrato fechado do CRM) no lugar de
 * `selectCrm`/`selectCrmStrict`.
 */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), fetchIndustryPeerIds: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/crm-db', () => ({ fetchIndustryPeerIds: mocks.fetchIndustryPeerIds }));

import { DEMO_CLIENT_ID } from '@/lib/bi/demoClient';
import { useClientAffinity } from '@/hooks/bi/useClientAffinity';
import { useClientCategoryAffinity } from '@/hooks/bi/useClientCategoryAffinity';
import { useIndustryTrends } from '@/hooks/bi/useIndustryTrends';
import { useIndustryCategoryTrends } from '@/hooks/bi/useIndustryCategoryTrends';

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function useFontes(clientId: string) {
  return {
    affinity: useClientAffinity(clientId),
    categories: useClientCategoryAffinity(clientId),
    trends: useIndustryTrends('Tecnologia', clientId),
    industryCategories: useIndustryCategoryTrends('Tecnologia', clientId),
  };
}

describe('fronteira entre dado real e modo de demonstração do BI', () => {
  beforeEach(() => {
    mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
    mocks.fetchIndustryPeerIds.mockReset().mockResolvedValue([]);
  });

  it('entrega as zonas simuladas sem tocar no banco para o cliente de demonstração', async () => {
    const { result } = renderHook(() => useFontes(DEMO_CLIENT_ID), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.affinity.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.trends.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.industryCategories.isLoading).toBe(false));

    expect(result.current.affinity.data?.isMock).toBe(true);
    expect(result.current.affinity.data?.categories.length).toBeGreaterThan(0);
    expect(result.current.categories.isMock).toBe(true);
    expect(result.current.categories.categories.length).toBeGreaterThan(0);
    expect(result.current.categories.favorite).not.toBeNull();
    expect(result.current.trends.data?.isMock).toBe(true);
    expect(result.current.trends.data?.trends.length).toBeGreaterThan(0);
    expect(result.current.industryCategories.isMock).toBe(true);
    expect(result.current.industryCategories.categories.length).toBeGreaterThan(0);

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.fetchIndustryPeerIds).not.toHaveBeenCalled();
  });

  it('não converte resposta vazia do banco em número fabricado para cliente real', async () => {
    mocks.fetchIndustryPeerIds.mockResolvedValue(['empresa-do-ramo-1']);

    const { result } = renderHook(() => useFontes('cliente-real-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.affinity.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.categories.isLoading).toBe(false));
    await waitFor(() => expect(result.current.trends.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.industryCategories.isLoading).toBe(false));

    expect(result.current.affinity.data).toMatchObject({
      isMock: false,
      realProductsCount: 0,
      categories: [],
    });
    expect(result.current.categories).toMatchObject({ isMock: false, categories: [], favorite: null });
    expect(result.current.trends.data).toMatchObject({ isMock: false, trends: [] });
    expect(result.current.industryCategories).toMatchObject({ isMock: false, categories: [] });

    expect(mocks.rpc).toHaveBeenCalled();
    expect(mocks.fetchIndustryPeerIds).toHaveBeenCalled();
  });
});
