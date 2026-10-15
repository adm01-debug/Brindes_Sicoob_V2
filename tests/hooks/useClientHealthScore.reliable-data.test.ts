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
        client: [],
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

  it('preserva recência confiável quando a amostra do setor e a sazonalidade são insuficientes', () => {
    const result = buildHealthResult(
      {
        hasData: true,
        isUnavailable: false,
        isLoading: false,
        daysSinceLastOrder: 20,
        ltv: 12_000,
        avgTicket: 2_000,
        ordersCount: 6,
        recentOrders: [],
      } as never,
      { hasEnoughSample: false, isLoading: false, metrics: [] } as never,
      { hasEnoughData: false, isLoading: false, client: [] } as never,
    );

    expect(result.score).toBe(100);
    expect(result.tier).toBe('healthy');
    expect(result.breakdown.recency).toMatchObject({ score: 100, weight: 100 });
    expect(result.breakdown.frequency.weight).toBe(0);
    expect(result.breakdown.ticket.weight).toBe(0);
    expect(result.breakdown.shareOfWallet.weight).toBe(0);
    expect(result.crossZoneInsight).toContain('não tem janela sazonal comprovada');
  });
});
