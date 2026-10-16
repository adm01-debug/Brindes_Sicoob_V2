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

import { resolveSeasonalityResult, useClientSeasonality } from '@/hooks/bi/useClientSeasonality';

describe('useClientSeasonality — falhas das fontes reais', () => {
  beforeEach(() => {
    mocks.options = null;
    mocks.useQuery.mockReset().mockImplementation((options: Record<string, unknown>) => {
      mocks.options = options;
      return { data: undefined, isLoading: false, isError: true, error: new Error('fonte indisponível'), refetch: vi.fn() };
    });
    mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
    mocks.selectCrmStrict.mockReset().mockResolvedValue([{ id: 'empresa-1' }]);
    mocks.isDemoClient.mockReset().mockReturnValue(false);
  });

  it('propaga falha do histórico do cliente', async () => {
    const { result } = renderHook(() => useClientSeasonality('cliente-real', 'Cooperativa'));
    expect(result.current.isError).toBe(true);
    expect(result.current.refetch).toBeTypeOf('function');
    const queryFn = mocks.options?.queryFn as (() => Promise<unknown>) | undefined;

    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'histórico indisponível' } });
    await expect(queryFn?.()).rejects.toMatchObject({ message: 'histórico indisponível' });

  });

  it('preserva o histórico do cliente quando a consulta opcional do setor falha', async () => {
    renderHook(() => useClientSeasonality('cliente-real', 'Cooperativa'));
    const queryFn = mocks.options?.queryFn as (() => Promise<{ clientRows: unknown[]; industryRows: unknown[]; industryError?: unknown }>) | undefined;
    const clientRows = [{ year: 2026, month: 2, quotes_count: 4, total_revenue: 800, avg_ticket: 200 }];
    mocks.rpc.mockResolvedValueOnce({ data: clientRows, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'setor indisponível' } });
    const data = await queryFn?.();

    expect(data?.clientRows).toEqual(clientRows);
    expect(data?.industryRows).toEqual([]);
    expect(data?.industryError).toMatchObject({ message: 'setor indisponível' });
    const resolved = resolveSeasonalityResult(data as never, false);
    expect(resolved.client.find((month) => month.month === 2)?.quotesCount).toBe(4);
    expect(resolved.industryError).toMatchObject({ message: 'setor indisponível' });
  });

  it('mantém o histórico do cliente quando o CRM do setor falha', async () => {
    mocks.selectCrmStrict.mockRejectedValueOnce(new Error('CRM indisponível'));
    renderHook(() => useClientSeasonality('cliente-real', 'Cooperativa'));
    const queryFn = mocks.options?.queryFn as (() => Promise<{ clientRows: unknown[]; industryRows: unknown[]; industryError?: unknown }>) | undefined;
    const clientRows = [{ year: 2026, month: 2, quotes_count: 4, total_revenue: 800, avg_ticket: 200 }];
    mocks.rpc.mockResolvedValueOnce({ data: clientRows, error: null });
    const data = await queryFn?.();

    expect(data?.clientRows).toEqual(clientRows);
    expect(data?.industryRows).toEqual([]);
    expect(data?.industryError).toBeInstanceOf(Error);
    expect((data?.industryError as Error).message).toBe('CRM indisponível');
    const resolved = resolveSeasonalityResult(data as never, false);
    expect(resolved.client.find((month) => month.month === 2)?.quotesCount).toBe(4);
    expect(resolved.industryError).toBeInstanceOf(Error);
  });

  it('preserva mercado legitimamente vazio sem marcar indisponibilidade', async () => {
    mocks.selectCrmStrict.mockResolvedValueOnce([]);
    renderHook(() => useClientSeasonality('cliente-real', 'Cooperativa'));
    const queryFn = mocks.options?.queryFn as (() => Promise<{ clientRows: unknown[]; industryRows: unknown[]; industryError?: unknown }>) | undefined;
    const clientRows = [{ year: 2026, month: 2, quotes_count: 4, total_revenue: 800, avg_ticket: 200 }];
    mocks.rpc.mockResolvedValueOnce({ data: clientRows, error: null });

    const data = await queryFn?.();
    expect(data).toMatchObject({ clientRows, industryRows: [], companiesCount: 0 });
    expect(data?.industryError).toBeUndefined();
  });
});
