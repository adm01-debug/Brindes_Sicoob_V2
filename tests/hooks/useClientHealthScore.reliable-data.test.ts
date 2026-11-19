/**
 * Catraca do BI honesto: o score de saúde nunca pode virar número fabricado para o vendedor.
 *  1. score 0 com tier 'unknown' é sentinela de indisponível, não um zero real (getAvailableHealthScore);
 *  2. amostra setorial insuficiente não vira score, potencial ou recomendação — nem com recência
 *     ou sazonalidade reais do cliente;
 *  3. fonte caída vira estado de erro com refetch das três fontes, nunca classificação de risco.
 *
 * Recuperado de tests/hooks/useClientHealthScore.reliable-data.test.ts da PR #112 (fechada sem merge),
 * reescrito contra a API atual de @/hooks/bi/useClientHealthScore.
 */
import { describe, expect, it, vi } from 'vitest';
import { buildHealthResult, getAvailableHealthScore } from '@/hooks/bi/useClientHealthScore';
import { useClientBI } from '@/hooks/bi/useClientBI';
import { useClientVsIndustry } from '@/hooks/bi/useClientVsIndustry';
import { useClientSeasonality } from '@/hooks/bi/useClientSeasonality';

type Bi = ReturnType<typeof useClientBI>;
type Vs = ReturnType<typeof useClientVsIndustry>;
type Seas = ReturnType<typeof useClientSeasonality>;

function bi(overrides: Partial<Bi> = {}): Bi {
  return {
    isLoading: false, isError: false, error: null, refetch: async () => undefined,
    hasData: true, isUnavailable: false, isMock: false,
    ltv: 12000, avgTicket: 2000, ordersCount: 6, daysSinceLastOrder: 20,
    recentOrders: [],
    ...overrides,
  } as unknown as Bi;
}

function vs(overrides: Partial<Vs> = {}): Vs {
  return {
    isLoading: false, isError: false, error: null, refetch: async () => undefined,
    hasEnoughSample: true, isMock: false, hasClientData: true, isClientDataUnavailable: false,
    metrics: [
      { label: 'Frequência (pedidos)', clientValue: 6, industryAvg: 4, deltaPercent: 50, classification: 'above' },
      { label: 'Ticket médio', clientValue: 2000, industryAvg: 1500, deltaPercent: 33, classification: 'above' },
    ],
    ...overrides,
  } as unknown as Vs;
}

function seas(overrides: Partial<Seas> = {}): Seas {
  const mes = new Date().getMonth() + 1;
  return {
    isLoading: false, isError: false, error: null, refetch: async () => undefined,
    isMock: false, hasEnoughData: true, monthsCovered: 12, windowMonths: 12,
    client: [{ month: mes, monthLabel: 'M', quotesCount: 3 }],
    industry: [], topClientMonths: [], topIndustryMonths: [],
    nextPeakMonth: null, daysToNextPeak: null, insight: null, industryError: undefined,
    ...overrides,
  } as unknown as Seas;
}

describe('score de saúde com fonte comprovada', () => {
  it('não trata o score sentinela desconhecido como um zero real', () => {
    expect(getAvailableHealthScore({ score: 0, tier: 'unknown' })).toBeNull();
    expect(getAvailableHealthScore({ score: 0, tier: 'risk' })).toBe(0);
    expect(getAvailableHealthScore({ score: 82, tier: 'healthy' })).toBe(82);
  });

  it('não fabrica score, potencial ou recomendação quando a amostra é insuficiente', () => {
    const resultado = buildHealthResult(
      bi({ hasData: false, ltv: 0, avgTicket: 0, ordersCount: 0, daysSinceLastOrder: null }),
      vs({ hasEnoughSample: false, metrics: [] }),
      seas({ hasEnoughData: false, client: [] }),
    );

    expect(resultado).toMatchObject({
      isError: false,
      unavailableReason: 'insufficient-data',
      score: 0,
      tier: 'unknown',
      shareOfWalletPct: 0,
      potentialUntappedBRL: 0,
      growthPct: null,
      nextActionLabel: 'Dados insuficientes',
      ctaUrgent: false,
    });
    expect(resultado.crossZoneInsight).toMatch(/Não há dados suficientes/);
  });

  it('não publica score global com amostra setorial insuficiente, mesmo havendo recência do cliente', () => {
    const resultado = buildHealthResult(
      bi(),
      vs({
        hasEnoughSample: false,
        metrics: [
          { label: 'Frequência (pedidos)', clientValue: 6, industryAvg: 4, deltaPercent: 50, classification: 'above' },
        ],
      } as Partial<Vs>),
      seas({ hasEnoughData: false, client: [] }),
    );

    expect(resultado.score).toBe(0);
    expect(resultado.tier).toBe('unknown');
    expect(getAvailableHealthScore(resultado)).toBeNull();
    expect(resultado.breakdown.recency.label).toBe('Dados insuficientes');
  });

  it('não publica score global com amostra setorial insuficiente mesmo que a sazonalidade exista', () => {
    const mesAtual = new Date().getMonth() + 1;
    const mesAnterior = ((mesAtual + 10) % 12) + 1;
    const resultado = buildHealthResult(
      bi(),
      vs({ hasEnoughSample: false, metrics: [] }),
      seas({
        hasEnoughData: true,
        client: [
          { month: mesAtual, monthLabel: 'M', quotesCount: 3 },
          { month: mesAnterior, monthLabel: 'M-1', quotesCount: 1 },
        ],
      } as Partial<Seas>),
    );

    expect(resultado.tier).toBe('unknown');
    expect(getAvailableHealthScore(resultado)).toBeNull();
  });

  it('calcula score quando a amostra setorial atinge o mínimo confiável', () => {
    const resultado = buildHealthResult(bi(), vs(), seas({ hasEnoughData: false, client: [] }));

    expect(resultado.tier).not.toBe('unknown');
    expect(getAvailableHealthScore(resultado)).not.toBeNull();
    expect(resultado.breakdown.frequency.weight).toBeGreaterThan(0);
  });

  it('propaga falha e refetch das fontes sem gerar classificação de risco', async () => {
    const refetchHistorico = vi.fn(async () => undefined);
    const refetchBenchmark = vi.fn(async () => undefined);
    const refetchSazonalidade = vi.fn(async () => undefined);
    const erroDaFonte = new Error('histórico indisponível');

    const resultado = buildHealthResult(
      bi({ hasData: false, isUnavailable: true, error: erroDaFonte, refetch: refetchHistorico } as Partial<Bi>),
      vs({ metrics: [], refetch: refetchBenchmark } as Partial<Vs>),
      seas({ hasEnoughData: false, client: [], refetch: refetchSazonalidade } as Partial<Seas>),
    );

    expect(resultado.tier).toBe('unknown');
    expect(resultado.isError).toBe(true);
    expect(resultado.error).toBe(erroDaFonte);
    expect(resultado.unavailableReason).toBe('source-error');
    expect(getAvailableHealthScore(resultado)).toBeNull();

    await resultado.refetch();
    expect(refetchHistorico).toHaveBeenCalledOnce();
    expect(refetchBenchmark).toHaveBeenCalledOnce();
    expect(refetchSazonalidade).toHaveBeenCalledOnce();
  });

  it('não publica score global quando a consulta do benchmark falha, mesmo com recência e sazonalidade reais', () => {
    const resultado = buildHealthResult(
      bi(),
      vs({ hasEnoughSample: false, isError: true, error: null, metrics: [] }),
      seas(),
    );

    expect(resultado).toMatchObject({
      score: 0,
      tier: 'unknown',
      nextActionLabel: 'Dados insuficientes',
      ctaUrgent: false,
    });
    expect(getAvailableHealthScore(resultado)).toBeNull();
  });
});
