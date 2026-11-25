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


/** Data dentro da janela movel (ontem). */
const data = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

/** Pagina cheia do teto: 5.000 linhas e, opcionalmente, a contagem exata do bridge. */
function paginasCheias(count?: number | null) {
  const linha = {
    summary_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    stock_close: 4,
    units_depleted: 1,
    units_restocked: 0,
    supplier_id: 'fornecedor-1',
  };
  const records = Array.from({ length: 5000 }, () => linha);
  return async (request: { limit?: number }) => {
    if (request.limit === 1) return { records: [] as unknown[] };
    return { records, count };
  };
}

function erroDoBridge(mensagem: string): Error {
  const erro = new Error('Edge Function returned a non-2xx status code') as Error & { context: Response };
  erro.context = new Response(JSON.stringify({ error: mensagem }), { status: 400 });
  return erro;
}

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
    // Ordem invertida na mesma resposta: se o hook nao ordenasse, a serie sairia 3, 2.
    invoke.mockResolvedValueOnce({ records: [dia(2, 5), dia(3, 2)] });

    const { result } = renderHook(() => useMarketIntelligenceMacro(30), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const serie = result.current.data?.daily.map((ponto) => [ponto.date, ponto.depleted]) ?? [];
    expect(serie.map(([, depleted]) => depleted)).toEqual([2, 5]);
    expect(serie.map(([date]) => date)).toEqual([...serie.map(([date]) => date)].sort((a, b) => a.localeCompare(b)));
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

  it('sinaliza resultado parcial quando existe registro acima do teto', async () => {
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
    // A sonda (limit 1 no offset do teto) encontra uma linha: existe dado alem do teto.
    invoke.mockImplementation(async (request: { limit?: number }) =>
      request.limit === 1 ? { records: [linha] } : { records: paginaCheia },
    );

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(13);
    expect(invoke.mock.calls[12][0]).toEqual(expect.objectContaining({ offset: 60000, limit: 1 }));
    expect(result.current.data?.truncated).toBe(true);
  });

  it('nao avisa parcial quando o total coincide exatamente com o teto', async () => {
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
    // 12 paginas cheias (60.000 = teto) e a sonda vazia: nada alem do teto.
    invoke.mockImplementation(async (request: { limit?: number }) =>
      request.limit === 1 ? { records: [] } : { records: paginaCheia },
    );

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(13);
    expect(invoke.mock.calls[12][0]).toEqual(expect.objectContaining({ offset: 60000 }));
    expect(result.current.data?.truncated).toBe(false);
  });

  it('marca parcial quando o bridge degrade a pagina (timeout reduz o limite)', async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const linha = {
      summary_date: ontem.toISOString().slice(0, 10),
      stock_close: 4,
      units_depleted: 1,
      units_restocked: 0,
      supplier_id: 'fornecedor-1',
    };
    invoke.mockResolvedValueOnce({
      records: Array.from({ length: 50 }, () => linha),
      meta: { pagination_degraded: true, effective_limit: 50 },
    });

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.current.data?.truncated).toBe(true);
  });

  it('usa a contagem exata do bridge e dispensa a sonda quando o teto passa', async () => {
    // 60.005 no filtro: a contagem da pagina cheia ja denuncia o dado sobrando.
    invoke.mockImplementation(paginasCheias(60005));

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(12);
    expect(result.current.data?.truncated).toBe(true);
  });

  it('usa a contagem exata do bridge e nao avisa quanto o total e o teto', async () => {
    invoke.mockImplementation(paginasCheias(60000));

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(12);
    expect(result.current.data?.truncated).toBe(false);
  });

  it('nao trata falha da sonda do teto como fim de leitura', async () => {
    // Sem contagem do bridge, a sonda responde; time out dela nao prova que acabou o dado.
    invoke.mockImplementation(async (request: { limit?: number }) => {
      if (request.limit === 1) throw new Error('statement timeout');
      return { records: Array.from({ length: 5000 }, () => ({ summary_date: data(), stock_close: 4, units_depleted: 1, units_restocked: 0, supplier_id: 'fornecedor-1' })) };
    });

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(13);
    expect(result.current.data?.truncated).toBe(true);
  });

  it('trata deslocamento recusado na sonda como fim de leitura de verdade', async () => {
    invoke.mockImplementation(async (request: { limit?: number }) => {
      // Formato real do bridge: 400 com `{ error }` no corpo e mensagem generica no Error.
      if (request.limit === 1) throw erroDoBridge('PGRST103: Requested range not satisfiable');
      return { records: Array.from({ length: 5000 }, () => ({ summary_date: data(), stock_close: 4, units_depleted: 1, units_restocked: 0, supplier_id: 'fornecedor-1' })) };
    });

    const { result } = renderHook(() => useMarketIntelligenceMacro(360), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(13);
    expect(result.current.data?.truncated).toBe(false);
  });
});
