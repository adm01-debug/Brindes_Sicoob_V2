import { render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  daily: vi.fn(),
  velocity: vi.fn(),
  intelligence: vi.fn(),
}));

vi.mock('@/hooks/useStockHistory', () => ({
  useStockDailySummary: mocks.daily,
  useStockVelocity: mocks.velocity,
  useProductIntelligenceData: mocks.intelligence,
  aggregateDailySummaryByDate: vi.fn(() => []),
  getActiveFlags: vi.fn(() => []),
}));

import { ProductRiskDetail } from '@/components/inventory/risk/ProductRiskDetail';
import { useProductIntelligenceBadges } from '@/hooks/useProductIntelligenceBadges';

function emptyQuery() {
  return { data: undefined, isLoading: false, isFetching: false, isError: false, error: null, refetch: vi.fn() };
}

describe('inteligência de produto baseada em dados reais', () => {
  beforeEach(() => {
    mocks.daily.mockReset().mockReturnValue(emptyQuery());
    mocks.velocity.mockReset().mockReturnValue(emptyQuery());
    mocks.intelligence.mockReset().mockReturnValue(emptyQuery());
  });

  it('mantém apenas indicadores cadastrais quando não há métricas de mercado', () => {
    const { result } = renderHook(() =>
      useProductIntelligenceBadges('produto-real', { featured: true }),
    );

    expect(result.current.badges.map((badge) => badge.type)).toEqual(['featured']);
    expect(result.current.turnoverScore).toBeNull();
    expect(result.current.demandLevel).toBeNull();
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current).not.toHaveProperty('isDemo');
  });

  it('propaga falhas, conserva indicadores em cache e tenta novamente ambas as fontes', async () => {
    const retryIntel = vi.fn().mockResolvedValue({});
    const retryVelocity = vi.fn().mockResolvedValue({});
    mocks.intelligence.mockReturnValue({
      ...emptyQuery(),
      data: { abc_classification: 'A', turnover_score: 72, avg_velocity_7d: 4 },
      isError: true,
      error: new Error('indisponível'),
      refetch: retryIntel,
    });
    mocks.velocity.mockReturnValue({
      ...emptyQuery(),
      isError: true,
      error: new Error('indisponível'),
      refetch: retryVelocity,
    });

    const { result } = renderHook(() => useProductIntelligenceBadges('produto-real'));

    expect(result.current.isError).toBe(true);
    expect(result.current.hasMarketData).toBe(true);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.badges.some((badge) => badge.type === 'best-seller')).toBe(true);
    await result.current.retry();
    expect(retryIntel).toHaveBeenCalledOnce();
    expect(retryVelocity).toHaveBeenCalledOnce();
  });

  it('exibe estado vazio no risco sem fabricar estoque, saída ou fornecedor', () => {
    render(
      <MemoryRouter>
        <ProductRiskDetail productId="produto-real" productName="Garrafa Sicoob" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Sem histórico operacional para Garrafa Sicoob/)).toBeTruthy();
    expect(screen.getByText(/movimentos reais de estoque/)).toBeTruthy();
    expect(screen.queryByText(/demo/i)).toBeNull();
    expect(screen.queryByText('Spot Promo')).toBeNull();
  });

  it('mantém métricas reais de velocity/intelligence e mostra estado vazio no gráfico sem série diária', () => {
    mocks.daily.mockReturnValue({ ...emptyQuery(), data: [] });
    mocks.velocity.mockReturnValue({
      ...emptyQuery(),
      data: [{ avg_daily_depletion_7d: 2, current_stock: 10, days_to_stockout: 5, velocity_trend: 1.2 }],
    });
    mocks.intelligence.mockReturnValue({
      ...emptyQuery(),
      data: { total_current_stock: 10, supplier_count: 1, abc_classification: 'A' },
    });

    render(
      <MemoryRouter>
        <ProductRiskDetail productId="produto-real" productName="Garrafa Sicoob" />
      </MemoryRouter>,
    );

    const emptyChartMessage = screen.getByText('Sem histórico de estoque para este período.');
    expect(emptyChartMessage.closest('[role="status"]')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('Classe A')).toBeTruthy();
    expect(screen.queryByText(/Sem histórico operacional/)).toBeNull();
  });
});
