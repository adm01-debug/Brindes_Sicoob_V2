/**
 * Os indicadores da tela /clientes têm de sair de medição, não de constante.
 *
 * Antes, "Novos (Mês)" era `"12"` e "Taxa Retenção" era `"94%"`, digitados no
 * componente sob o comentário "Indicadores mockados para demonstração".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { range, chamadas, eqSpies } = vi.hoisted(() => ({
  range: vi.fn(),
  chamadas: [] as Array<Record<string, unknown>>,
  eqSpies: [] as Array<ReturnType<typeof vi.fn>>,
}));

vi.mock('@/integrations/supabase/client', () => {
  function construtor(registro: Record<string, unknown>) {
    const builder: Record<string, unknown> = {
      select: vi.fn((colunas: string) => { registro.colunas = colunas; return builder; }),
      neq: vi.fn((coluna: string, valor: string) => { registro.neq = [coluna, valor]; return builder; }),
      gte: vi.fn((coluna: string, valor: string) => { registro.gte = [coluna, valor]; return builder; }),
      order: vi.fn((coluna: string) => { registro.order = coluna; return builder; }),
      range: vi.fn((de: number, ate: number) => {
        registro.range = [de, ate];
        return range(registro);
      }),
    };
    return builder;
  }
  return {
    supabase: {
      from: vi.fn(() => {
        const registro: Record<string, unknown> = {};
        chamadas.push(registro);
        return construtor(registro);
      }),
    },
  };
});

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

import { fetchClientsPortfolioKpis } from '@/hooks/useClientsPortfolioKpis';

const AGORA = new Date('2026-11-18T12:00:00.000Z');

/** Resultado aguardável que também aceita `.eq()` do applySellerScope. */
function resposta(resultado: { data: unknown; error: unknown }) {
  const encadeado: Record<string, unknown> = {
    then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
      Promise.resolve(resultado).then(ok, falha),
  };
  const eq = vi.fn(() => encadeado);
  encadeado.eq = eq;
  eqSpies.push(eq);
  return encadeado;
}

describe('fetchClientsPortfolioKpis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chamadas.length = 0;
    eqSpies.length = 0;
  });

  it('conta clientes distintos do mês e calcula o ticket médio da janela', async () => {
    range
      .mockReturnValueOnce(resposta({
        data: [{ client_id: 'c-1' }, { client_id: 'c-1' }, { client_id: 'c-2' }, { client_id: null }],
        error: null,
      }))
      .mockReturnValueOnce(resposta({
        data: [{ total: 1000 }, { total: 3000 }, { total: 2000 }],
        error: null,
      }));

    const kpis = await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    // c-1 aparece duas vezes e o pedido sem cliente não conta.
    expect(kpis.clientesComPedidoNoMes).toBe(2);
    expect(kpis.ticketMedio).toBe(2000);
    expect(kpis.pedidosNaJanela).toBe(3);
    expect(kpis.janelaDias).toBe(90);
  });

  it('exclui pedido cancelado nas duas consultas', async () => {
    range
      .mockReturnValueOnce(resposta({ data: [], error: null }))
      .mockReturnValueOnce(resposta({ data: [], error: null }));

    await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    // Pedido cancelado não é compra: não conta cliente comprador nem ticket.
    expect(chamadas).toHaveLength(2);
    chamadas.forEach((registro) => expect(registro.neq).toEqual(['status', 'cancelado']));
  });

  it('pagina até esgotar a janela, em vez de usar só a primeira resposta', async () => {
    const paginaCheia = Array.from({ length: 1000 }, (_, i) => ({ total: i < 999 ? 100 : 100 }));
    range
      .mockReturnValueOnce(resposta({ data: [{ client_id: 'c-1' }], error: null }))
      .mockReturnValueOnce(resposta({ data: paginaCheia, error: null }))
      .mockReturnValueOnce(resposta({ data: [{ total: 100_200 }], error: null }));

    const kpis = await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    // 1.000 pedidos de R$ 100 mais um de R$ 100.200 → média 200, não 100.
    expect(kpis.pedidosNaJanela).toBe(1001);
    expect(kpis.ticketMedio).toBe(200);
  });

  it('devolve ticket nulo quando não houve pedido na janela, em vez de zero', async () => {
    range
      .mockReturnValueOnce(resposta({ data: [], error: null }))
      .mockReturnValueOnce(resposta({ data: [], error: null }));

    const kpis = await fetchClientsPortfolioKpis('self', 'usuario-1', AGORA);

    expect(kpis.clientesComPedidoNoMes).toBe(0);
    // Nulo e não 0: a tela mostra "—", que é diferente de "ticket de R$ 0".
    expect(kpis.ticketMedio).toBeNull();
    // Escopo `self` tem de filtrar por vendedor nas duas consultas.
    expect(eqSpies).toHaveLength(2);
    eqSpies.forEach((eq) => expect(eq).toHaveBeenCalledWith('seller_id', 'usuario-1'));
  });

  it('propaga erro da consulta em vez de devolver número inventado', async () => {
    range
      .mockReturnValueOnce(resposta({ data: null, error: new Error('RLS negou') }))
      .mockReturnValueOnce(resposta({ data: [], error: null }));

    await expect(fetchClientsPortfolioKpis('team', 'usuario-1', AGORA)).rejects.toThrow('RLS negou');
  });

  it('recorta a janela do mês e a de 90 dias a partir da data informada', async () => {
    range
      .mockReturnValueOnce(resposta({ data: [], error: null }))
      .mockReturnValueOnce(resposta({ data: [], error: null }));

    await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    const [mes, janela] = chamadas as Array<{ gte: [string, string]; colunas: string }>;
    expect(mes.colunas).toBe('client_id');
    expect(mes.gte[0]).toBe('created_at');
    expect(mes.gte[1]).toContain('2026-11-01');
    expect(janela.colunas).toBe('total');
    // 18/11 menos 90 dias cai em 20/08.
    expect(janela.gte[1]).toContain('2026-08-20');
  });
});
