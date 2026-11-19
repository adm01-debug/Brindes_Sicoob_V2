/**
 * Regra travada: o BI não pode mostrar número fabricado ao vendedor.
 * `useClientCategoryAffinity` só pode devolver o conjunto simulado para o
 * cliente de demonstração (`isDemoClient`); para cliente real, RPC negada
 * precisa virar estado de erro com retry — nunca categoria favorita fictícia,
 * nem histórico vazio silencioso.
 *
 * Origem: tests/hooks/useClientCategoryAffinity.error.test.tsx da PR #112
 * (fechada sem merge). Reescrito contra a API atual da `main`
 * (src/hooks/bi/useClientCategoryAffinity.ts), que expõe `isMock`,
 * `realProductsCount`, `categories`, `favorite`, `isError` e `refetch`.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));

import { useClientCategoryAffinity } from '@/hooks/bi/useClientCategoryAffinity';
import { DEMO_CLIENT_ID } from '@/lib/bi/demoClient';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useClientCategoryAffinity — falha da fonte real', () => {
  beforeEach(() => {
    mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  });

  it('RPC negada vira estado de erro com retry, não histórico vazio', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('sem conexão') });

    const { result } = renderHook(() => useClientCategoryAffinity('cliente-real'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.categories).toEqual([]);
    expect(result.current.favorite).toBeNull();
    expect(result.current.refetch).toBeTypeOf('function');
  });

  it('cliente real com fonte caída nunca recebe o conjunto simulado', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('rpc negada') });

    const { result } = renderHook(() => useClientCategoryAffinity('cliente-real'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isMock).toBe(false);
    expect(result.current.realProductsCount).toBe(0);
  });

  it('cliente real sem histórico fica vazio e sem erro, sem favorita fabricada', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useClientCategoryAffinity('cliente-real'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.isMock).toBe(false);
    expect(result.current.categories).toEqual([]);
    expect(result.current.favorite).toBeNull();
  });

  it('só o cliente de demonstração recebe o conjunto simulado, e sem tocar a RPC', async () => {
    const { result } = renderHook(() => useClientCategoryAffinity(DEMO_CLIENT_ID), { wrapper });

    await waitFor(() => expect(result.current.isMock).toBe(true));
    expect(result.current.categories.length).toBeGreaterThan(0);
    expect(result.current.favorite).not.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
