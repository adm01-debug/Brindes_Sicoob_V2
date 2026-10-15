import { describe, expect, it } from 'vitest';

import { buildHealthResult, getAvailableHealthScore } from '@/hooks/bi/useClientHealthScore';

describe('score de saúde com fonte comprovada', () => {
  it('não trata o score sentinela desconhecido como um zero real', () => {
    expect(getAvailableHealthScore({ score: 0, tier: 'unknown' })).toBeNull();
    expect(getAvailableHealthScore({ score: 0, tier: 'risk' })).toBe(0);
    expect(getAvailableHealthScore({ score: 82, tier: 'healthy' })).toBe(82);
  });

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

  it('não publica score global com amostra setorial insuficiente, mesmo havendo recência do cliente', () => {
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
      {
        hasEnoughSample: false,
        isLoading: false,
        metrics: [
          { label: 'Frequência (pedidos)', clientValue: 6, industryAvg: 4, deltaPercent: 50 },
        ],
      } as never,
      { hasEnoughData: false, isLoading: false, client: [] } as never,
    );

    expect(result.score).toBe(0);
    expect(result.tier).toBe('unknown');
    expect(getAvailableHealthScore(result)).toBeNull();
    expect(result.breakdown.recency.label).toBe('Dados insuficientes');
  });

  it('não publica score global com amostra setorial insuficiente mesmo que a sazonalidade exista', () => {
    const currentMonth = new Date().getMonth() + 1;
    const previousMonth = ((currentMonth + 10) % 12) + 1;
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
      {
        hasEnoughData: true,
        isLoading: false,
        client: [
          { month: currentMonth, quotesCount: 3 },
          { month: previousMonth, quotesCount: 1 },
        ],
      } as never,
    );

    expect(result.tier).toBe('unknown');
    expect(getAvailableHealthScore(result)).toBeNull();
  });

  it('calcula score quando a amostra setorial atinge o mínimo confiável', () => {
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
      {
        hasEnoughSample: true,
        isLoading: false,
        metrics: [
          { label: 'Frequência (pedidos)', clientValue: 6, industryAvg: 4, deltaPercent: 50 },
          { label: 'Ticket médio', clientValue: 2_000, industryAvg: 1_500, deltaPercent: 33 },
        ],
      } as never,
      { hasEnoughData: false, isLoading: false, client: [] } as never,
    );

    expect(result.tier).not.toBe('unknown');
    expect(getAvailableHealthScore(result)).not.toBeNull();
    expect(result.breakdown.frequency.weight).toBeGreaterThan(0);
  });

  it('não gera classificação de risco quando o histórico do cliente falha', () => {
    const result = buildHealthResult(
      { hasData: false, isUnavailable: true, isLoading: false } as never,
      { hasEnoughSample: true, isLoading: false, metrics: [] } as never,
      { hasEnoughData: false, isLoading: false, client: [] } as never,
    );

    expect(result.tier).toBe('unknown');
    expect(getAvailableHealthScore(result)).toBeNull();
  });

  it('não publica score global quando a consulta do benchmark falha, mesmo com recência e sazonalidade reais', () => {
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
      { hasEnoughSample: false, isLoading: false, isError: true, metrics: [] } as never,
      {
        hasEnoughData: true,
        isLoading: false,
        client: [{ month: new Date().getMonth() + 1, quotesCount: 3 }],
      } as never,
    );

    expect(result).toMatchObject({
      score: 0,
      tier: 'unknown',
      nextActionLabel: 'Dados insuficientes',
      ctaUrgent: false,
    });
    expect(getAvailableHealthScore(result)).toBeNull();
  });
});
