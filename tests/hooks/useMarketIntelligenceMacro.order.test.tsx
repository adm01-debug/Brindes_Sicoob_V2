import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/lib/external-db', () => ({ invokeExternalDb: invoke }));

import { useMarketIntelligenceMacro } from '@/hooks/useMarketIntelligenceMacro';

describe('janela de consulta do mercado macro', () => {
  it('pede os registros mais recentes primeiro, porque o corte por periodo vem depois do limite', async () => {
    invoke.mockResolvedValue({ records: [] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMarketIntelligenceMacro(30), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { column: 'summary_date', ascending: false } }),
    );
  });
});
