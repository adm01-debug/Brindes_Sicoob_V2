/**
 * Regressões do diagnóstico de saúde do cliente:
 *  1. prospect sem compra não pode sair classificado como saudável;
 *  2. tendência de trimestre só entra quando a janela sazonal é comprovada.
 */
import { describe, expect, it } from 'vitest';
import { buildHealthResult } from '@/hooks/bi/useClientHealthScore';
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
    ltv: 120000, avgTicket: 10000, ordersCount: 12, daysSinceLastOrder: 20,
    ...overrides,
  } as unknown as Bi;
}

function vs(overrides: Partial<Vs> = {}): Vs {
  return {
    isLoading: false, isError: false, error: null, refetch: async () => undefined,
    hasEnoughSample: true, isMock: false, hasClientData: true, isClientDataUnavailable: false,
    metrics: [
      { label: 'Frequência (pedidos)', clientValue: 12, industryAvg: 10, deltaPercent: 20, classification: 'above' },
      { label: 'Ticket médio', clientValue: 10000, industryAvg: 9000, deltaPercent: 11, classification: 'above' },
    ],
    ...overrides,
  } as unknown as Vs;
}

function seas(overrides: Partial<Seas> = {}): Seas {
  const mes = new Date().getMonth() + 1;
  return {
    isLoading: false, isError: false, isMock: false,
    hasEnoughData: true, monthsCovered: 12, windowMonths: 12,
    client: [{ month: mes, monthLabel: 'M', quotesCount: 30 }],
    industry: [], topClientMonths: [], topIndustryMonths: [],
    nextPeakMonth: null, daysToNextPeak: null, insight: null, industryError: undefined,
    ...overrides,
  } as unknown as Seas;
}

describe('buildHealthResult — honestidade do diagnóstico', () => {
  it('cliente sem compra registrada não recebe diagnóstico, mesmo com orçamentos', () => {
    const resultado = buildHealthResult(
      bi({ hasData: false, ltv: 0, avgTicket: 0, ordersCount: 0, daysSinceLastOrder: null }),
      vs(),
      seas(),
    );

    expect(resultado.tier).toBe('unknown');
    expect(resultado.unavailableReason).toBe('insufficient-data');
    expect(resultado.nextActionLabel).toBe('Dados insuficientes');
  });

  it('sem janela sazonal comprovada a tendência não é medida nem citada', () => {
    const resultado = buildHealthResult(bi(), vs(), seas({ hasEnoughData: false }));

    expect(resultado.tier).not.toBe('unknown');
    expect(resultado.growthPct).toBeNull();
    expect(resultado.breakdown.growth.weight).toBe(0);
    expect(resultado.crossZoneInsight).not.toMatch(/cresce|caiu/);
  });

  it('com janela sazonal comprovada a tendência volta a ser medida', () => {
    const resultado = buildHealthResult(bi(), vs(), seas());

    expect(resultado.growthPct).not.toBeNull();
    expect(resultado.breakdown.growth.weight).toBeGreaterThan(0);
  });
});
