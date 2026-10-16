import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  rpc: vi.fn(),
  isDemoClient: vi.fn(),
  options: null as null | Record<string, unknown>,
}));

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/bi/demoClient', () => ({ isDemoClient: mocks.isDemoClient }));

import { useClientCategoryAffinity } from '@/hooks/bi/useClientCategoryAffinity';

describe('useClientCategoryAffinity — falha da fonte real', () => {
  beforeEach(() => {
    mocks.options = null;
    mocks.isDemoClient.mockReset().mockReturnValue(false);
    mocks.rpc.mockReset();
    mocks.useQuery.mockReset().mockImplementation((options: Record<string, unknown>) => {
      mocks.options = options;
      return {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('RPC indisponível'),
        refetch: vi.fn(),
      };
    });
  });

  it('expõe estado de erro e retry em vez de apresentar falha como histórico vazio', async () => {
    const { result } = renderHook(() => useClientCategoryAffinity('cliente-real'));

    expect(result.current.isError).toBe(true);
    expect(result.current.categories).toEqual([]);
    expect(result.current.refetch).toBeTypeOf('function');

    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'sem conexão' } });
    const queryFn = mocks.options?.queryFn as (() => Promise<unknown>) | undefined;
    await expect(queryFn?.()).rejects.toMatchObject({ message: 'sem conexão' });
  });
});
