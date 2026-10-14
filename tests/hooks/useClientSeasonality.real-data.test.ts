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
});
