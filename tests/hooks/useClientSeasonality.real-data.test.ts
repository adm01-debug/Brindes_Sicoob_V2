/**
 * Catraca: o BI não pode mostrar sazonalidade fabricada ao vendedor.
 *
 * Trava três regras de `src/hooks/bi/useClientSeasonality.ts`
 * (`resolveSeasonalityResult`, o resolvedor puro que a tela consome):
 *  1. amostra vazia continua vazia e marcada (`isMock: false`, `hasEnoughData: false`) —
 *     nunca cai no `getMockSeasonality()` para preencher o mapa de calor;
 *  2. o conjunto simulado só sai com o modo de demonstração explícito, que por sua vez
 *     só liga para o `DEMO_CLIENT_ID` (`isDemoClient`);
 *  3. amostra insuficiente (<3 meses observados) não vira insight: sem top 3, sem
 *     próximo pico, sem texto — um ou dois meses medidos não são previsão.
 * A contraprova é o caso 4: com 3 meses reais os números saem do histórico, não do mock.
 *
 * Origem: `tests/hooks/useClientSeasonality.real-data.test.ts` da PR #112 (fechada sem
 * merge), reescrito para a API atual da `main` (`resolveSeasonalityResult(data, isLoading,
 * useDemoData)` com `industryError` no payload).
 */
import { describe, expect, it } from 'vitest';

import { resolveSeasonalityResult } from '@/hooks/bi/useClientSeasonality';
import { DEMO_CLIENT_ID, isDemoClient } from '@/lib/bi/demoClient';

function clientRow(year: number, month: number, quotes: number) {
  return {
    year,
    month,
    quotes_count: quotes,
    total_revenue: quotes * 1000,
    avg_ticket: 1000,
  };
}

describe('sazonalidade sem dados artificiais', () => {
  it('mantém a amostra vazia quando não há histórico', () => {
    const result = resolveSeasonalityResult(
      { clientRows: [], industryRows: [] },
      false,
    );

    expect(result.isMock).toBe(false);
    expect(result.hasEnoughData).toBe(false);
    expect(result.monthsCovered).toBe(0);
    expect(result.topClientMonths).toEqual([]);
    expect(result.topIndustryMonths).toEqual([]);
    expect(result.insight).toBeNull();
    expect(result.nextPeakMonth).toBeNull();
    expect(result.client).toHaveLength(12);
    expect(result.client.every((cell) => cell.quotesCount === 0)).toBe(true);
    expect(result.industry.every((cell) => cell.avgQuotesPerCompany === 0)).toBe(true);
  });

  it('gera a amostra fictícia apenas no modo de demonstração explícito', () => {
    const demo = resolveSeasonalityResult(undefined, false, true);

    expect(demo.isMock).toBe(true);
    expect(demo.hasEnoughData).toBe(true);
    expect(demo.monthsCovered).toBe(24);
    expect(demo.topClientMonths).toHaveLength(3);
    expect(demo.client.some((cell) => cell.quotesCount > 0)).toBe(true);

    // o mesmo payload vazio, sem a flag, não pode produzir o mesmo mapa
    const real = resolveSeasonalityResult(undefined, false);
    expect(real.isMock).toBe(false);
    expect(real.client.every((cell) => cell.quotesCount === 0)).toBe(true);

    // e a flag só liga para o cliente de demonstração
    expect(isDemoClient(DEMO_CLIENT_ID)).toBe(true);
    expect(isDemoClient('0f0a5a7e-1111-4d0a-9c3b-000000000001')).toBe(false);
    expect(isDemoClient(null)).toBe(false);
  });

  it('não transforma um ou dois meses observados em previsão de pico', () => {
    const result = resolveSeasonalityResult(
      {
        clientRows: [clientRow(2026, 2, 4), clientRow(2026, 8, 2)],
        industryRows: [],
      },
      false,
    );

    expect(result.monthsCovered).toBe(2);
    expect(result.isMock).toBe(false);
    expect(result.hasEnoughData).toBe(false);
    expect(result.topClientMonths).toEqual([]);
    expect(result.nextPeakMonth).toBeNull();
    expect(result.daysToNextPeak).toBeNull();
    expect(result.insight).toBeNull();
  });

  it('usa o histórico real assim que a amostra é suficiente', () => {
    const result = resolveSeasonalityResult(
      {
        clientRows: [clientRow(2026, 3, 5), clientRow(2026, 7, 1), clientRow(2026, 11, 9)],
        industryRows: [],
      },
      false,
    );

    expect(result.isMock).toBe(false);
    expect(result.hasEnoughData).toBe(true);
    expect(result.monthsCovered).toBe(3);
    // top 3 vem das linhas acima, não do padrão fixo do mock
    expect(result.topClientMonths.map((cell) => cell.month)).toEqual([11, 3, 7]);
    const quotesByMonth = new Map(result.client.map((cell) => [cell.month, cell.quotesCount]));
    expect(quotesByMonth.get(3)).toBe(5);
    expect(quotesByMonth.get(11)).toBe(9);
    // meses não observados seguem zerados, não interpolados
    expect(quotesByMonth.get(1)).toBe(0);
    expect(result.insight).toContain('Cliente concentra');
  });
});
