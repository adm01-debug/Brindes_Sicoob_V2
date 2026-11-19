/**
 * Regressão: falha do CRM virava "setor sem tendência" com `isError: false`,
 * cacheada por 10 min — copiloto e briefing respondiam sobre dado não medido.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchIndustryPeerIds: vi.fn(), rpc: vi.fn() }));

vi.mock('@/lib/crm-db', () => ({ fetchIndustryPeerIds: mocks.fetchIndustryPeerIds }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));

import { useIndustryTrends } from '@/hooks/bi/useIndustryTrends';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useIndustryTrends — falha do CRM', () => {
  beforeEach(() => {
    mocks.fetchIndustryPeerIds.mockReset();
    mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  });

  it('falha do CRM vira isError, não setor sem tendência', async () => {
    mocks.fetchIndustryPeerIds.mockRejectedValue(new Error('CRM fora do ar'));

    const { result } = renderHook(() => useIndustryTrends('Tecnologia', 'c1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('setor que respondeu sem produto continua sem erro', async () => {
    mocks.fetchIndustryPeerIds.mockResolvedValue(['empresa-1']);

    const { result } = renderHook(() => useIndustryTrends('Tecnologia', 'c1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
  });
});
