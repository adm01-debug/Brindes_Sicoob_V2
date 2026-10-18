import { describe, expect, it } from 'vitest';

import { resolveSeasonalityResult } from '@/hooks/bi/useClientSeasonality';

describe('sazonalidade sem dados artificiais', () => {
  it('mantém a amostra vazia quando não há histórico suficiente', () => {
    const result = resolveSeasonalityResult(
      { clientRows: [], industryRows: [], companiesCount: 0 },
      false,
    );

    expect(result.isMock).toBe(false);
    expect(result.hasEnoughData).toBe(false);
    expect(result.monthsCovered).toBe(0);
    expect(result.topClientMonths).toEqual([]);
    expect(result.topIndustryMonths).toEqual([]);
    expect(result.insight).toBeNull();
    expect(result.client.every((cell) => cell.quotesCount === 0)).toBe(true);
    expect(result.industry.every((cell) => cell.avgQuotesPerCompany === 0)).toBe(true);
  });

  it('gera a amostra fictícia apenas quando o modo de demonstração é explícito', () => {
    const result = resolveSeasonalityResult(undefined, false, true);

    expect(result.isMock).toBe(true);
    expect(result.hasEnoughData).toBe(true);
    expect(result.monthsCovered).toBe(24);
    expect(result.topClientMonths).toHaveLength(3);
    expect(result.client.some((cell) => cell.quotesCount > 0)).toBe(true);
  });

  it('não transforma um ou dois meses observados em previsão de pico', () => {
    const result = resolveSeasonalityResult({
      clientRows: [
        { year: 2026, month: 2, quotes_count: 4, total_revenue: 800, avg_ticket: 200 },
        { year: 2026, month: 8, quotes_count: 2, total_revenue: 300, avg_ticket: 150 },
      ],
      industryRows: [],
      companiesCount: 0,
    }, false);

    expect(result.hasEnoughData).toBe(false);
    expect(result.topClientMonths).toEqual([]);
    expect(result.nextPeakMonth).toBeNull();
    expect(result.daysToNextPeak).toBeNull();
    expect(result.insight).toBeNull();
  });
});
