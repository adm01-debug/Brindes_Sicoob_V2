/**
 * Regressão: falha do CRM ao buscar pares do ramo virava "setor sem categorias"
 * (`isError: false`), o que suprimia o aviso de fonte indisponível e o retry.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchIndustryPeerIds: vi.fn(), rpc: vi.fn() }));

vi.mock('@/lib/crm-db', () => ({ fetchIndustryPeerIds: mocks.fetchIndustryPeerIds }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));

import { useIndustryCategoryTrends } from '@/hooks/bi/useIndustryCategoryTrends';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useIndustryCategoryTrends — falha da fonte', () => {
  beforeEach(() => {
    mocks.fetchIndustryPeerIds.mockReset();
    mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  });

  it('falha do CRM vira isError, não setor vazio', async () => {
    mocks.fetchIndustryPeerIds.mockRejectedValue(new Error('CRM fora do ar'));

    const { result } = renderHook(() => useIndustryCategoryTrends('Tecnologia', 'c1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.categories).toEqual([]);
  });

  it('falha da RPC do setor também vira isError', async () => {
    mocks.fetchIndustryPeerIds.mockResolvedValue(['empresa-1']);
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('rpc negada') });

    const { result } = renderHook(() => useIndustryCategoryTrends('Tecnologia', 'c1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('setor que respondeu sem linha medida continua vazio e sem erro', async () => {
    mocks.fetchIndustryPeerIds.mockResolvedValue(['empresa-1']);
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useIndustryCategoryTrends('Tecnologia', 'c1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.categories).toEqual([]);
  });
});
