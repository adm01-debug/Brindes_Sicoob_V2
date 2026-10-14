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
  return { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
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
    expect(result.current).not.toHaveProperty('isDemo');
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
});
