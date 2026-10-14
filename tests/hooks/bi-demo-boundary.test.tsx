import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  rpc: vi.fn(),
  selectCrm: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: dependencies.rpc },
}));

vi.mock('@/lib/crm-db', () => ({
  selectCrm: dependencies.selectCrm,
}));

import { useClientAffinity } from '@/hooks/bi/useClientAffinity';
import { useClientCategoryAffinity } from '@/hooks/bi/useClientCategoryAffinity';
import { useIndustryTrends } from '@/hooks/bi/useIndustryTrends';
import { useIndustryCategoryTrends } from '@/hooks/bi/useIndustryCategoryTrends';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function useSources(clientId: string) {
  return {
    affinity: useClientAffinity(clientId),
    categories: useClientCategoryAffinity(clientId),
    trends: useIndustryTrends('Tecnologia', clientId),
    industryCategories: useIndustryCategoryTrends('Tecnologia', clientId),
  };
}

describe('fronteira entre dados reais e modo de demonstração do BI', () => {
  beforeEach(() => {
    dependencies.rpc.mockReset().mockResolvedValue({ data: [], error: null });
    dependencies.selectCrm.mockReset().mockResolvedValue([]);
  });

  it('entrega todas as zonas simuladas sem acessar banco para o cliente demo', async () => {
    const { result } = renderHook(() => useSources('demo-client-bi-preview'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.affinity.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.trends.isSuccess).toBe(true));

    expect(result.current.affinity.data?.isMock).toBe(true);
    expect(result.current.affinity.data?.categories.length).toBeGreaterThan(0);
    expect(result.current.categories.isMock).toBe(true);
    expect(result.current.categories.categories.length).toBeGreaterThan(0);
    expect(result.current.trends.data?.isMock).toBe(true);
    expect(result.current.trends.data?.trends.length).toBeGreaterThan(0);
    expect(result.current.industryCategories.isMock).toBe(true);
    expect(result.current.industryCategories.categories.length).toBeGreaterThan(0);
    expect(dependencies.rpc).not.toHaveBeenCalled();
    expect(dependencies.selectCrm).not.toHaveBeenCalled();
  });

  it('não converte respostas vazias do banco em números fictícios para cliente real', async () => {
    const { result } = renderHook(() => useSources('cliente-real'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.affinity.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.categories.isLoading).toBe(false));
    await waitFor(() => expect(result.current.trends.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.industryCategories.isLoading).toBe(false));

    expect(result.current.affinity.data).toMatchObject({ isMock: false, categories: [] });
    expect(result.current.categories).toMatchObject({ isMock: false, categories: [] });
    expect(result.current.trends.data).toMatchObject({ isMock: false, trends: [] });
    expect(result.current.industryCategories).toMatchObject({ isMock: false, categories: [] });
    expect(dependencies.rpc).toHaveBeenCalled();
    expect(dependencies.selectCrm).toHaveBeenCalled();
  });
});
