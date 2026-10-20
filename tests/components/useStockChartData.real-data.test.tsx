import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const source = vi.hoisted(() => ({
  summaries: [] as Array<Record<string, unknown>>,
  velocity: [] as Array<Record<string, unknown>>,
  intelligence: null as Record<string, unknown> | null,
}));

vi.mock('@/hooks/useStockHistory', () => ({
  useStockDailySummary: () => ({
    data: source.summaries,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useStockVelocity: () => ({ data: source.velocity, error: null, refetch: vi.fn() }),
  useProductIntelligenceData: () => ({ data: source.intelligence, error: null, refetch: vi.fn() }),
  aggregateDailySummaryByDate: (summaries: Array<Record<string, unknown>>) =>
    summaries.map((summary) => ({
      date: summary.summary_date,
      stockClose: summary.stock_close,
      depleted: summary.units_depleted,
      restocked: summary.units_restocked,
      restockDetected: summary.restock_detected,
      costPriceClose: summary.cost_price_close,
    })),
  extractUniqueSupplierIds: (summaries: Array<Record<string, unknown>>) => [
    ...new Set(summaries.map((summary) => summary.supplier_id).filter(Boolean)),
  ],
  getActiveFlags: () => [],
}));

vi.mock('@/hooks/useSupplierNames', () => ({
  useSupplierNames: () => ({ data: new Map() }),
}));

import { useStockChartData } from '@/components/products/useStockChartData';

describe('useStockChartData', () => {
  it('não cria histórico, fornecedores ou indicadores quando a fonte não retorna dados', () => {
    source.summaries = [];
    source.velocity = [];
    source.intelligence = null;

    const { result } = renderHook(() => useStockChartData('produto-sem-historico'));

    expect(result.current.hasData).toBe(false);
    expect(result.current.chartData).toEqual([]);
    expect(result.current.effectiveVelocities).toEqual([]);
    expect(result.current.effectiveIntelligence).toBeNull();
    expect(result.current.supplierOptions).toEqual([]);
    expect(result.current.flags).toEqual([]);
  });

  it('mantém o histórico retornado pela fonte externa', () => {
    // Data dinâmica: sempre 5 dias atrás, dentro da janela de 30 dias do hook.
    // (Data fixa aqui vira teste-bomba-relógio: sai da janela e o filtro descarta a linha.)
    const cincoDiasAtras = new Date();
    cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);
    const dataRecente = cincoDiasAtras.toISOString().slice(0, 10);
    source.summaries = [
      {
        summary_date: dataRecente,
        stock_close: 42,
        units_depleted: 3,
        units_restocked: 10,
        restock_detected: true,
        cost_price_close: 12.5,
        supplier_id: 'fornecedor-1',
      },
    ];
    source.velocity = [];
    source.intelligence = null;

    const { result } = renderHook(() => useStockChartData('produto-com-historico'));

    expect(result.current.hasData).toBe(true);
    expect(result.current.chartData).toHaveLength(1);
    expect(result.current.chartData[0]).toMatchObject({
      stockClose: 42,
      depleted: 3,
      restocked: 10,
      restockDetected: true,
      costPriceClose: 12.5,
    });
  });
});
