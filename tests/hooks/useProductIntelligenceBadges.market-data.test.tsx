import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StockVelocity } from '@/hooks/useStockHistory';

const mocks = vi.hoisted(() => ({ intel: vi.fn(), velocity: vi.fn() }));

vi.mock('@/hooks/useStockHistory', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useStockHistory')>('@/hooks/useStockHistory');
  return { ...actual, useProductIntelligenceData: mocks.intel, useStockVelocity: mocks.velocity };
});

import { useProductIntelligenceBadges } from '@/hooks/useProductIntelligenceBadges';

const VELOCIDADE = {
  variant_supplier_source_id: 'source-1',
  supplier_id: 'supplier-1',
  product_id: 'product-1',
  variant_id: 'variant-1',
  current_stock: 30,
  avg_daily_depletion_7d: 12,
  avg_daily_depletion_30d: 8,
  avg_daily_depletion_90d: 6,
  velocity_trend: 1.5,
  days_to_stockout: 3,
  total_depleted_7d: 84,
  total_depleted_30d: 240,
  total_depleted_90d: 540,
  total_restocked_30d: 100,
  restock_events_30d: 2,
  avg_days_between_restocks: 15,
  price_changes_30d: 1,
  active_days_7d: 7,
  active_days_30d: 30,
  active_days_90d: 90,
} as StockVelocity;

const refetch = vi.fn();

describe('useProductIntelligenceBadges — o que conta como indicador de mercado', () => {
  it('velocidade sozinha nao autoriza o aviso de "dados continuam exibidos"', () => {
    mocks.intel.mockReturnValue({
      data: null, isLoading: false, isError: true, isFetching: false, refetch,
    });
    mocks.velocity.mockReturnValue({
      data: [VELOCIDADE], isLoading: false, isError: false, isFetching: false, refetch,
    });

    const { result } = renderHook(() => useProductIntelligenceBadges('product-1', { featured: true }));

    expect(result.current.isError).toBe(true);
    // Nada de mercado é renderizado sem inteligência: o aviso não pode prometer dado.
    expect(result.current.hasMarketData).toBe(false);
    // Mas a velocidade respondeu, então não é ausência confirmada.
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.badges.map((b) => b.type)).toEqual(['featured']);
    expect(result.current.turnoverScore).toBeNull();
  });

  it('velocidade respondida com inteligência vazia não é ausência de dados', () => {
    // As duas consultas responderam: inteligência sem linha e velocidade com
    // histórico. Não há aviso de erro, então `isEmpty` não pode ser falso por causa
    // da falha — aqui ele depende só de haver algum dado medido.
    mocks.intel.mockReturnValue({
      data: null, isLoading: false, isError: false, isFetching: false, refetch,
    });
    mocks.velocity.mockReturnValue({
      data: [VELOCIDADE], isLoading: false, isError: false, isFetching: false, refetch,
    });

    const { result } = renderHook(() => useProductIntelligenceBadges('product-1'));

    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasMarketData).toBe(false);
  });

  it('inteligência presente mantém o aviso de dado já medido mesmo com falha', () => {
    mocks.intel.mockReturnValue({
      data: { abc_classification: 'B', turnover_score: 55, is_stockout_risk: false, total_current_stock: 10, avg_velocity_7d: 4 },
      isLoading: false, isError: true, isFetching: false, refetch,
    });
    mocks.velocity.mockReturnValue({
      data: undefined, isLoading: false, isError: true, isFetching: false, refetch,
    });

    const { result } = renderHook(() => useProductIntelligenceBadges('product-1'));

    expect(result.current.hasMarketData).toBe(true);
    expect(result.current.badges.map((b) => b.type)).toEqual(['popular']);
  });
});
