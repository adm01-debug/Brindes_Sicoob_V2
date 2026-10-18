import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  rpc: vi.fn(),
  selectCrmStrict: vi.fn(),
  isDemoClient: vi.fn(),
  options: null as null | Record<string, unknown>,
}));

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/crm-db', () => ({ selectCrmStrict: mocks.selectCrmStrict }));
vi.mock('@/lib/bi/demoClient', () => ({ isDemoClient: mocks.isDemoClient }));

import { useIndustryCategoryTrends } from '@/hooks/bi/useIndustryCategoryTrends';

describe('useIndustryCategoryTrends — integridade da amostra do setor', () => {
  beforeEach(() => {
    mocks.options = null;
    mocks.isDemoClient.mockReset().mockReturnValue(false);
    mocks.selectCrmStrict.mockReset().mockResolvedValue([{ id: 'empresa-1' }]);
    mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
    mocks.useQuery.mockReset().mockImplementation((options: Record<string, unknown>) => {
      mocks.options = options;
      return { data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() };
    });
  });

  it('propaga indisponibilidade do CRM e da RPC', async () => {
    renderHook(() => useIndustryCategoryTrends('Cooperativa', 'cliente-real'));
    const queryFn = mocks.options?.queryFn as (() => Promise<unknown>) | undefined;

    mocks.selectCrmStrict.mockRejectedValueOnce(new Error('CRM indisponível'));
    await expect(queryFn?.()).rejects.toThrow('CRM indisponível');

    mocks.selectCrmStrict.mockResolvedValueOnce([{ id: 'empresa-1' }]);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC indisponível' } });
    await expect(queryFn?.()).rejects.toMatchObject({ message: 'RPC indisponível' });
  });

  it('preserva setor legitimamente vazio sem consultar a RPC', async () => {
    mocks.selectCrmStrict.mockResolvedValueOnce([]);
    renderHook(() => useIndustryCategoryTrends('Cooperativa', 'cliente-real'));
    const queryFn = mocks.options?.queryFn as (() => Promise<unknown>) | undefined;

    await expect(queryFn?.()).resolves.toEqual({ isMock: false, companiesInRamo: 0, categories: [] });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
