import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/lib/external-db', () => ({ invokeExternalDb: invoke }));

import { useMarketIntelligenceMacro } from '@/hooks/useMarketIntelligenceMacro';

const novoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
let client = novoCliente();
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

const cutoffDoPedido = (call: unknown) =>
  (call as { filters: { summary_date_gte: string } }).filters.summary_date_gte;

describe('janela de consulta do mercado macro', () => {
  beforeEach(() => {
    client = novoCliente();
    invoke.mockReset();
  });

  it('pede os registros mais recentes primeiro, de forma paginada', async () => {
    invoke.mockResolvedValue({ records: [] });

    const { result } = renderHook(() => useMarketIntelligenceMacro(30), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { column: 'summary_date', ascending: false } }),
    );
  });

  it('amplia a janela no servidor: 360 dias pede um corte anterior ao de 30 dias', async () => {
    invoke.mockResolvedValue({ records: [] });

    const curto = renderHook(() => useMarketIntelligenceMacro(30), { wrapper });
    await waitFor(() => expect(curto.result.current.isSuccess).toBe(true));
    const corteCurto = cutoffDoPedido(invoke.mock.calls[0][0]);
    curto.unmount();

    invoke.mockClear();
    client = novoCliente();

    const longo = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });
    await waitFor(() => expect(longo.result.current.isSuccess).toBe(true));
    const corteLongo = cutoffDoPedido(invoke.mock.calls[0][0]);

    expect(corteLongo < corteCurto).toBe(true);
  });

  it('acumula as paginas ate a ultima incompleta, sem truncar o historico', async () => {
    const linha = {
      summary_date: '2026-01-05',
      stock_close: 10,
      units_depleted: 1,
      units_restocked: 0,
      supplier_id: 'fornecedor-1',
    };
    invoke
      .mockResolvedValueOnce({ records: Array.from({ length: 5000 }, () => ({ ...linha })), count: 5001 })
      .mockResolvedValueOnce({ records: [linha], count: 5001 });

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1][0]).toEqual(expect.objectContaining({ offset: 5000 }));
  });
});
