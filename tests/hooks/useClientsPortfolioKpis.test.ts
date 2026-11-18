/**
 * Os indicadores da tela /clientes têm de sair de medição, não de constante.
 *
 * Antes, "Novos (Mês)" era `"12"` e "Taxa Retenção" era `"94%"`, digitados no
 * componente sob o comentário "Indicadores mockados para demonstração".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { gte, eqSpies } = vi.hoisted(() => ({
  gte: vi.fn(),
  eqSpies: [] as Array<ReturnType<typeof vi.fn>>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ select: vi.fn(() => ({ gte })) })) },
}));

import { fetchClientsPortfolioKpis } from '@/hooks/useClientsPortfolioKpis';

const AGORA = new Date('2026-11-18T12:00:00.000Z');

/**
 * Builder encadeável: `applySellerScope` chama `.eq()` quando o escopo é
 * `self`, e o resultado tem de continuar aguardável depois disso.
 */
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
    eqSpies.length = 0;
  });

  it('conta clientes distintos do mês e calcula o ticket médio da janela', async () => {
    gte
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
    // Escopo `all`: nenhum filtro por vendedor.
    expect(eqSpies.every((eq) => eq.mock.calls.length === 0)).toBe(true);
  });

  it('devolve ticket nulo quando não houve pedido na janela, em vez de zero', async () => {
    gte
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
    gte
      .mockReturnValueOnce(resposta({ data: null, error: new Error('RLS negou') }))
      .mockReturnValueOnce(resposta({ data: [], error: null }));

    await expect(fetchClientsPortfolioKpis('team', 'usuario-1', AGORA)).rejects.toThrow('RLS negou');
  });

  it('recorta a janela do mês e a de 90 dias a partir da data informada', async () => {
    gte
      .mockReturnValueOnce(resposta({ data: [], error: null }))
      .mockReturnValueOnce(resposta({ data: [], error: null }));

    await fetchClientsPortfolioKpis('all', 'usuario-1', AGORA);

    expect(gte.mock.calls).toHaveLength(2);
    const [primeira, segunda] = gte.mock.calls as Array<[string, string]>;
    expect(primeira).toEqual(['created_at', expect.stringContaining('2026-11-01')]);
    // 18/11 menos 90 dias cai em 20/08.
    expect(segunda).toEqual(['created_at', expect.stringContaining('2026-08-20')]);
  });
});
