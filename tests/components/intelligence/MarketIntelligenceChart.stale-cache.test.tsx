import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ market: vi.fn() }));

vi.mock('@/hooks/useMarketIntelligenceMacro', () => ({ useMarketIntelligenceMacro: mocks.market }));
vi.mock('@/hooks/useSupplierNames', () => ({ useSupplierNames: () => ({ data: new Map() }) }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="market-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Bar: () => null,
  ComposedChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

import { MarketIntelligenceChart } from '@/components/intelligence/MarketIntelligenceChart';

describe('cache de inteligência de mercado após falha de atualização', () => {
  beforeEach(() => {
    mocks.market.mockReset();
  });

  it('mantém o gráfico e sinaliza cache desatualizado com retry', () => {
    const refetch = vi.fn();
    mocks.market.mockReturnValue({
      data: {
        daily: [{ date: '2026-10-14', stockClose: 80, depleted: 10, restocked: 3 }],
        suppliers: [], supplierIds: [],
        kpis: {
          totalDepleted7d: 10, totalDepleted30d: 10, totalRestocked30d: 3,
          totalCurrentStock: 80, avgDailyDepletion: 10, supplierCount: 0,
          topDepletionDay: { date: '2026-10-14', value: 10 },
        },
      },
      isLoading: false,
      error: new Error('refetch falhou'),
      refetch,
    });

    render(<MarketIntelligenceChart />);

    expect(screen.getByText(/Exibindo o último gráfico disponível/).closest('[role="status"]')).toBeTruthy();
    expect(screen.getByTestId('market-chart')).toBeTruthy();
    expect(screen.getByLabelText(/Vendas no mercado: 10\.0/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
