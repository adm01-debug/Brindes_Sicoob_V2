import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const history = vi.hoisted(() => ({
  lastClientId: undefined as string | undefined,
  result: {
    data: undefined as undefined | {
      orders: Array<{
        id: string;
        order_number: string;
        status: string;
        total: number;
        created_at: string;
        notes: string | null;
      }>;
      ordersCount: number;
      totalLtv: number;
      avgTicket: number;
      lastOrderAt: string | null;
    },
    isLoading: false,
    isError: false,
  },
}));

vi.mock('@/hooks/useClientOrdersHistory', () => ({
  useClientOrdersHistory: (clientId?: string) => {
    history.lastClientId = clientId;
    return history.result;
  },
}));

import { getAvailableClientHistory, useClientBI } from '@/hooks/bi/useClientBI';

describe('useClientBI com dados confiáveis', () => {
  beforeEach(() => {
    history.result.data = undefined;
    history.result.isLoading = false;
    history.result.isError = false;
    history.lastClientId = undefined;
  });

  it('retorna estado vazio sem injetar números ou categorias fictícias', () => {
    history.result.data = {
      orders: [],
      ordersCount: 0,
      totalLtv: 0,
      avgTicket: 0,
      lastOrderAt: null,
    };

    const { result } = renderHook(() => useClientBI('client-1'));

    expect(result.current).toMatchObject({
      isMock: false,
      hasData: false,
      isUnavailable: false,
      ltv: 0,
      avgTicket: 0,
      ordersCount: 0,
      topCategories: [],
      recentOrders: [],
    });
    expect(result.current.delta.hasPreviousData).toBe(false);
  });

  it('distingue falha de consulta de um cliente sem compras', () => {
    history.result.isError = true;

    const { result } = renderHook(() => useClientBI('client-1'));

    expect(result.current.isUnavailable).toBe(true);
    expect(result.current.hasData).toBe(false);
    expect(result.current.ltv).toBe(0);
    expect(getAvailableClientHistory(result.current)).toBeNull();
  });

  it('mantém zeros como dados válidos apenas quando a consulta confirmou ausência de pedidos', () => {
    history.result.data = {
      orders: [],
      ordersCount: 0,
      totalLtv: 0,
      avgTicket: 0,
      lastOrderAt: null,
    };

    const { result } = renderHook(() => useClientBI('client-1'));

    expect(getAvailableClientHistory(result.current)).toEqual({
      ltv: 0,
      avgTicket: 0,
      ordersCount: 0,
      daysSinceLastOrder: null,
    });
  });

  it('mantém dados fictícios somente no cliente de demonstração e não consulta histórico remoto', () => {
    const { result } = renderHook(() => useClientBI('demo-client-bi-preview'));

    expect(history.lastClientId).toBeUndefined();
    expect(result.current.isMock).toBe(true);
    expect(result.current.hasData).toBe(true);
    expect(result.current.ltv).toBeGreaterThan(0);
    expect(result.current.recentOrders.length).toBeGreaterThan(0);
  });
});
