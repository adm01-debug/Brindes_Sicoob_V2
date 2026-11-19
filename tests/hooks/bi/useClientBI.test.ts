/**
 * O caminho de dado real do BI de cliente não pode devolver categoria fictícia.
 *
 * A UI que consome isso afirma "100% baseado em pedidos reais"
 * (ClientCategoryRadar) e `useClientsComparison.resolveTopCategory` usa
 * `bi.topCategories[0].category` como categoria principal do cliente — com o
 * mock no caminho real, todo cliente real tinha a MESMA categoria principal.
 */
import { describe, expect, it, vi } from 'vitest';

const { useClientOrdersHistory } = vi.hoisted(() => ({
  useClientOrdersHistory: vi.fn(),
}));

vi.mock('@/hooks/useClientOrdersHistory', () => ({ useClientOrdersHistory }));

import { renderHook } from '@testing-library/react';
import { getAvailableClientHistory, useClientBI } from '@/hooks/bi/useClientBI';
import { DEMO_CLIENT_ID } from '@/lib/bi/demoClient';
import { MOCK_CLIENT_STATS } from '@/lib/bi/mockData';

function pedido(total: number, diasAtras: number) {
  return {
    id: `pedido-${diasAtras}`,
    total,
    status: 'entregue',
    created_at: new Date(Date.now() - diasAtras * 86400000).toISOString(),
    itemsCount: 2,
    productPreview: 'Caneta',
  };
}

describe('useClientBI', () => {
  it('não devolve categoria fictícia quando há pedido real', () => {
    useClientOrdersHistory.mockReturnValue({
      data: {
        ordersCount: 2,
        totalLtv: 5000,
        avgTicket: 2500,
        lastOrderAt: new Date().toISOString(),
        orders: [pedido(3000, 10), pedido(2000, 40)],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useClientBI('cliente-real'));

    expect(result.current.isMock).toBe(false);
    expect(result.current.topCategories).toEqual([]);
    // A prova do defeito: antes, isto era igual ao mock para QUALQUER cliente.
    expect(result.current.topCategories).not.toEqual(MOCK_CLIENT_STATS.topCategories);
    // O resto do caminho real continua medido.
    expect(result.current.ltv).toBe(5000);
    expect(result.current.ordersCount).toBe(2);
  });

  it('cliente real sem pedido nao recebe o conjunto simulado, nem com flag', () => {
    // Antes, QUALQUER cliente com zero pedidos recebia MOCK_CLIENT_STATS — LTV,
    // ticket e "última compra" de outra empresa — com um selo pequeno de "Dados
    // simulados" ao lado dos números grandes. Rótulo não conserta número
    // inventado: o simulado agora é exclusivo do cliente de demonstração
    // (`isDemoClient`, que a própria `main` já usa em
    // `BusinessIntelligencePage`). Recuperado da branch de produção
    // `claude/fix-prod-cors-audit-261118-1034`.
    useClientOrdersHistory.mockReturnValue({
      data: { ordersCount: 0, totalLtv: 0, avgTicket: 0, lastOrderAt: null, orders: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useClientBI('cliente-sem-historico'));

    expect(result.current.isMock).toBe(false);
    expect(result.current.hasData).toBe(false);
    expect(result.current.isUnavailable).toBe(false);
    expect(result.current.ltv).toBe(0);
    expect(result.current.topCategories).toEqual([]);
    expect(result.current.topCategories).not.toEqual(MOCK_CLIENT_STATS.topCategories);
  });

  it('cliente de demonstracao continua recebendo o conjunto simulado', () => {
    useClientOrdersHistory.mockReturnValue({
      data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn(),
    });

    const { result } = renderHook(() => useClientBI(DEMO_CLIENT_ID));

    expect(result.current.isMock).toBe(true);
    expect(result.current.topCategories).toEqual(MOCK_CLIENT_STATS.topCategories);
  });

  it('falha de consulta e estado proprio, nao cliente sem compras', () => {
    // `isUnavailable` existe para a UI poder mostrar "—" em vez de R$ 0: zero
    // real e zero por falha de rede são coisas diferentes para o vendedor.
    useClientOrdersHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('RLS negou'),
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useClientBI('cliente-com-falha'));

    expect(result.current.isUnavailable).toBe(true);
    expect(result.current.hasData).toBe(false);
    expect(result.current.isMock).toBe(false);
    expect(getAvailableClientHistory(result.current)).toBeNull();
  });
});
