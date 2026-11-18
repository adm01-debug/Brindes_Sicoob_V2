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
import { useClientBI } from '@/hooks/bi/useClientBI';
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

  it('mantém o conjunto simulado quando o cliente não tem pedido, com a flag ligada', () => {
    useClientOrdersHistory.mockReturnValue({
      data: { ordersCount: 0, totalLtv: 0, avgTicket: 0, lastOrderAt: null, orders: [] },
      isLoading: false,
    });

    const { result } = renderHook(() => useClientBI('cliente-sem-historico'));

    // Esse caminho é sinalizado na tela ("Dados simulados") e no PPTX/PDF.
    expect(result.current.isMock).toBe(true);
    expect(result.current.topCategories).toEqual(MOCK_CLIENT_STATS.topCategories);
  });
});
