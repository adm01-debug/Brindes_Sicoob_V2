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

import { useIndustryTrends } from '@/hooks/bi/useIndustryTrends';

describe('useIndustryTrends — integridade da amostra real', () => {
  beforeEach(() => {
    mocks.options = null;
    mocks.isDemoClient.mockReset().mockReturnValue(false);
    mocks.selectCrmStrict.mockReset().mockResolvedValue([{ id: 'empresa-1' }]);
    mocks.rpc.mockReset();
    mocks.useQuery.mockReset().mockImplementation((options: Record<string, unknown>) => {
      mocks.options = options;
      return { data: undefined, isLoading: false, isError: false };
    });
  });

  it('rejeita falhas de CRM e RPC em vez de classificá-las como amostra vazia', async () => {
    renderHook(() => useIndustryTrends('Cooperativa', 'cliente-real'));
    const queryFn = mocks.options?.queryFn as (() => Promise<unknown>) | undefined;

    mocks.selectCrmStrict.mockRejectedValueOnce(new Error('CRM indisponível'));
    await expect(queryFn?.()).rejects.toThrow('CRM indisponível');

    mocks.selectCrmStrict.mockResolvedValueOnce([{ id: 'empresa-1' }]);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC indisponível' } });
    await expect(queryFn?.()).rejects.toMatchObject({ message: 'RPC indisponível' });
  });

  it('preserva mercado legitimamente vazio sem consultar a RPC', async () => {
    mocks.selectCrmStrict.mockResolvedValueOnce([]);
    renderHook(() => useIndustryTrends('Cooperativa', 'cliente-real'));
    const queryFn = mocks.options?.queryFn as (() => Promise<unknown>) | undefined;

    await expect(queryFn?.()).resolves.toEqual({ isMock: false, companiesInRamo: 0, trends: [] });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('separa a chave de cache da demonstração da chave operacional', () => {
    renderHook(() => useIndustryTrends('Cooperativa', 'cliente-real'));
    const realKey = mocks.options?.queryKey;
    mocks.isDemoClient.mockReturnValue(true);
    renderHook(() => useIndustryTrends('Cooperativa', 'cliente-demo'));
    const demoKey = mocks.options?.queryKey;

    expect(realKey).not.toEqual(demoKey);
  });
});
