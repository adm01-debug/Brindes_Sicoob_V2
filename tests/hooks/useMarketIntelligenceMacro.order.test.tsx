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

  it('pagina por id (ordem total) para não repetir nem omitir dias empatados', async () => {
    invoke.mockResolvedValue({ records: [] });

    const { result } = renderHook(() => useMarketIntelligenceMacro(30), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { column: 'id', ascending: true } }),
    );
  });

  it('entrega a série em ordem cronológica mesmo paginando por id', async () => {
    const dia = (offset: number, depleted: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return {
        summary_date: d.toISOString().slice(0, 10),
        stock_close: 10,
        units_depleted: depleted,
        units_restocked: 0,
        supplier_id: 'fornecedor-1',
      };
    };
    invoke.mockResolvedValueOnce({ records: [dia(3, 2)] }).mockResolvedValueOnce({ records: [dia(2, 5)] });

    const { result } = renderHook(() => useMarketIntelligenceMacro(30), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const datas = result.current.data?.daily.map((ponto) => ponto.date) ?? [];
    expect(datas).toEqual([...datas].sort((a, b) => a.localeCompare(b)));
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
    // Data relativa ao relógio real: uma data fixa pode sair da janela móvel.
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const data = ontem.toISOString().slice(0, 10);
    const linha = (depleted: number) => ({
      summary_date: data,
      stock_close: 10,
      units_depleted: depleted,
      units_restocked: 0,
      supplier_id: 'fornecedor-1',
    });
    const primeiraPagina = Array.from({ length: 5000 }, () => linha(2));
    invoke
      .mockResolvedValueOnce({ records: primeiraPagina, count: 5001 })
      .mockResolvedValueOnce({ records: [linha(5)], count: 5001 });

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1][0]).toEqual(expect.objectContaining({ offset: 5000 }));
    // A segunda página precisa entrar na soma, não só na chamada.
    expect(result.current.data?.kpis.totalDepleted30d).toBe(5000 * 2 + 5);
    expect(result.current.data?.daily).toHaveLength(1);
    expect(result.current.data?.truncated).toBe(false);
  });

  it('encerra a leitura quando o PostgREST recusa o deslocamento igual ao total', async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const linha = {
      summary_date: ontem.toISOString().slice(0, 10),
      stock_close: 4,
      units_depleted: 1,
      units_restocked: 0,
      supplier_id: 'fornecedor-1',
    };
    invoke
      .mockResolvedValueOnce({ records: Array.from({ length: 5000 }, () => ({ ...linha })), count: 10000 })
      .mockRejectedValueOnce(new Error('PGRST103: Requested range not satisfiable'));

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.daily).toHaveLength(1);
    expect(result.current.data?.truncated).toBe(false);
  });

  it('sinaliza resultado parcial ao atingir o teto de leitura', async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const linha = {
      summary_date: ontem.toISOString().slice(0, 10),
      stock_close: 4,
      units_depleted: 1,
      units_restocked: 0,
      supplier_id: 'fornecedor-1',
    };
    const paginaCheia = Array.from({ length: 5000 }, () => linha);
    invoke.mockResolvedValue({ records: paginaCheia });

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(12);
    expect(result.current.data?.truncated).toBe(true);
  });
});
