/**
 * Os indicadores da tela /clientes têm de sair de medição, não de constante.
 *
 * Antes, "Novos (Mês)" era `"12"` e "Taxa Retenção" era `"94%"`, digitados no
 * componente sob o comentário "Indicadores mockados para demonstração".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { range, historico, chamadas, eqSpies } = vi.hoisted(() => ({
  range: vi.fn(),
  historico: vi.fn(),
  chamadas: [] as Array<Record<string, unknown>>,
  eqSpies: [] as Array<ReturnType<typeof vi.fn>>,
}));

vi.mock('@/integrations/supabase/client', () => {
  function construtor(registro: Record<string, unknown>) {
    const builder: Record<string, unknown> = {
      select: vi.fn((colunas: string) => { registro.colunas = colunas; return builder; }),
      neq: vi.fn((coluna: string, valor: string) => { registro.neq = [coluna, valor]; return builder; }),
      gte: vi.fn((coluna: string, valor: string) => { registro.gte = [coluna, valor]; return builder; }),
      lt: vi.fn((coluna: string, valor: string) => { registro.lt = [coluna, valor]; return builder; }),
      order: vi.fn((coluna: string) => { registro.order = coluna; return builder; }),
      range: vi.fn((de: number, ate: number) => { registro.range = [de, ate]; return range(registro); }),
      // A consulta de histórico anterior termina no `.in`, sem paginar.
      in: vi.fn((coluna: string, valores: string[]) => { registro.in = [coluna, valores]; return historico(registro); }),
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

type Linha = { client_id?: string | null; total?: number | null };

/** Resultado aguardável que também aceita `.eq()` do applySellerScope. */
function resposta(data: Linha[] | null, error: unknown = null) {
  const encadeado: Record<string, unknown> = {
    then: (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
      Promise.resolve({ data, error }).then(ok, falha),
  };
  const eq = vi.fn(() => encadeado);
  encadeado.eq = eq;
  eqSpies.push(eq);
  return encadeado;
}

/** Qual das três consultas paginadas é esta. */
function qual(registro: Record<string, unknown>): 'mes' | 'anterior' | 'janela' {
  if (registro.lt) return 'anterior';
  return registro.colunas === 'client_id' ? 'mes' : 'janela';
}

/**
 * Programa as consultas por identidade, não por ordem de chamada: as três
 * paginadas saem num Promise.all e a ordem real intercala páginas.
 */
function programar(filas: {
  mes?: Linha[][];
  janela?: Linha[][];
  anterior?: Linha[][];
  historico?: Linha[];
  erroEm?: 'mes' | 'janela' | 'anterior';
}) {
  const pendentes: Record<string, Linha[][]> = {
    mes: [...(filas.mes ?? [])],
    janela: [...(filas.janela ?? [])],
    anterior: [...(filas.anterior ?? [])],
  };
  range.mockImplementation((registro: Record<string, unknown>) => {
    const chave = qual(registro);
    if (filas.erroEm === chave) return resposta(null, new Error('RLS negou'));
    return resposta(pendentes[chave]?.shift() ?? []);
  });
  historico.mockImplementation(() => resposta(filas.historico ?? []));
}

describe('fetchClientsPortfolioKpis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chamadas.length = 0;
    eqSpies.length = 0;
    programar({});
  });

  it('conta clientes distintos do mês e calcula o ticket médio da janela', async () => {
    programar({
      mes: [[{ client_id: 'c-1' }, { client_id: 'c-1' }, { client_id: 'c-2' }, { client_id: null }]],
      janela: [[
        { client_id: 'c-1', total: 1000 },
        { client_id: 'c-2', total: 3000 },
        { client_id: 'c-1', total: 2000 },
      ]],
    });

    const kpis = await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    // c-1 aparece duas vezes e o pedido sem cliente não conta.
    expect(kpis.clientesComPedidoNoMes).toBe(2);
    expect(kpis.ticketMedio).toBe(2000);
    expect(kpis.pedidosNaJanela).toBe(3);
    expect(kpis.janelaDias).toBe(90);
  });

  it('separa cliente de primeira compra de quem já comprava antes', async () => {
    programar({
      mes: [[{ client_id: 'novo-1' }, { client_id: 'antigo-1' }]],
      // Só `antigo-1` tem pedido anterior ao mês.
      historico: [{ client_id: 'antigo-1' }],
    });

    const kpis = await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    expect(kpis.clientesComPedidoNoMes).toBe(2);
    expect(kpis.primeiraCompraNoMes).toBe(1);
  });

  it('retenção é quem voltou a comprar, sobre quem comprava na janela anterior', async () => {
    programar({
      janela: [[{ client_id: 'c-1', total: 100 }, { client_id: 'c-3', total: 300 }]],
      anterior: [[
        { client_id: 'c-1' }, { client_id: 'c-2' }, { client_id: 'c-4' }, { client_id: 'c-5' },
      ]],
    });

    const kpis = await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    // Dos quatro da janela anterior só c-1 voltou.
    expect(kpis.clientesJanelaAnterior).toBe(4);
    expect(kpis.retencaoPercentual).toBe(25);
  });

  it('sem cliente na janela anterior a retenção é nula, não 0% nem 100%', async () => {
    programar({ janela: [[{ client_id: 'c-9', total: 500 }]] });

    const kpis = await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    expect(kpis.clientesJanelaAnterior).toBe(0);
    expect(kpis.retencaoPercentual).toBeNull();
  });

  it('exclui pedido cancelado em todas as consultas', async () => {
    programar({ mes: [[{ client_id: 'c-1' }]] });

    await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    // Pedido cancelado não é compra: não conta comprador, ticket, retenção
    // nem histórico anterior.
    expect(chamadas.length).toBeGreaterThanOrEqual(4);
    chamadas.forEach((registro) => expect(registro.neq).toEqual(['status', 'cancelado']));
  });

  it('pagina até esgotar a janela, em vez de usar só a primeira resposta', async () => {
    const paginaCheia: Linha[] = Array.from({ length: 1000 }, () => ({ total: 100 }));
    programar({ janela: [paginaCheia, [{ total: 100_200 }]] });

    const kpis = await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    // 1.000 pedidos de R$ 100 mais um de R$ 100.200 → média 200, não 100.
    expect(kpis.pedidosNaJanela).toBe(1001);
    expect(kpis.ticketMedio).toBe(200);
  });

  it('devolve ticket nulo quando não houve pedido na janela, em vez de zero', async () => {
    programar({});

    const kpis = await fetchClientsPortfolioKpis('self', 'usuario-1', AGORA);

    expect(kpis.clientesComPedidoNoMes).toBe(0);
    // Nulo e não 0: a tela mostra "—", que é diferente de "ticket de R$ 0".
    expect(kpis.ticketMedio).toBeNull();
    // Escopo `self` filtra por vendedor em toda consulta que sai.
    expect(eqSpies.length).toBeGreaterThanOrEqual(3);
    eqSpies.forEach((eq) => expect(eq).toHaveBeenCalledWith('seller_id', 'usuario-1'));
  });

  it('propaga erro da consulta em vez de devolver número inventado', async () => {
    programar({ erroEm: 'mes' });

    await expect(fetchClientsPortfolioKpis('team', 'usuario-1', AGORA)).rejects.toThrow('RLS negou');
  });

  it('recorta as três janelas a partir da data informada', async () => {
    programar({});

    await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    const porTipo = new Map(chamadas.filter((c) => c.range).map((c) => [qual(c), c]));
    expect(String((porTipo.get('mes')?.gte as string[])[1])).toContain('2026-11-01');
    // 18/11 menos 90 dias cai em 20/08.
    expect(String((porTipo.get('janela')?.gte as string[])[1])).toContain('2026-08-20');
    // Janela anterior: de 22/05 até 20/08.
    expect(String((porTipo.get('anterior')?.gte as string[])[1])).toContain('2026-05-22');
    expect(String((porTipo.get('anterior')?.lt as string[])[1])).toContain('2026-08-20');
  });
});
