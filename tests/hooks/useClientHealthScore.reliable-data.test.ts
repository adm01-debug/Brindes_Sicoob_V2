import { describe, expect, it } from 'vitest';

import { buildHealthResult } from '@/hooks/bi/useClientHealthScore';

describe('score de saúde com fonte comprovada', () => {
  it('não fabrica score, potencial ou recomendação quando a amostra é insuficiente', () => {
    const result = buildHealthResult(
      {
        hasData: false,
        isUnavailable: false,
        isLoading: false,
      } as never,
      {
        hasEnoughSample: false,
        isLoading: false,
        metrics: [],
      } as never,
      {
        hasEnoughData: false,
        isLoading: false,
      } as never,
    );

    expect(result).toMatchObject({
      score: 0,
      tier: 'unknown',
      shareOfWalletPct: 0,
      potentialUntappedBRL: 0,
      growthPct: 0,
      nextActionLabel: 'Dados insuficientes',
      ctaUrgent: false,
    });
    expect(result.crossZoneInsight).toMatch(/Não há dados suficientes/);
  });
});
