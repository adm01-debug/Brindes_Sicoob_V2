/**
 * Falha da consulta do setor não é falta de amostra: o selo tem de dizer qual
 * dos dois aconteceu, senão o vendedor lê "setor sem amostra" onde houve erro.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useClientSeasonality: vi.fn() }));

vi.mock('@/hooks/bi/useClientSeasonality', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/bi/useClientSeasonality')>();
  return { ...actual, useClientSeasonality: mocks.useClientSeasonality };
});

import { ClientSeasonalityHeatmap } from '@/components/bi/ClientSeasonalityHeatmap';

const meses = (campo: 'quotesCount' | 'avgQuotesPerCompany') =>
  Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthLabel: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i],
    quotesCount: campo === 'quotesCount' && i === 0 ? 3 : 0,
    avgQuotesPerCompany: campo === 'avgQuotesPerCompany' ? 0 : 0,
    totalRevenue: 0,
    avgTicket: 0,
    avgRevenuePerCompany: 0,
    sharePercent: 0,
    intensity: 0,
  }));

function cenario(industryError: unknown) {
  mocks.useClientSeasonality.mockReturnValue({
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
    industryError,
    isMock: false,
    hasEnoughData: true,
    hasClientData: true,
    hasIndustryData: false,
    dataStatus: 'insufficient',
    monthsCovered: 3,
    windowMonths: 24,
    client: meses('quotesCount'),
    industry: meses('avgQuotesPerCompany'),
    topClientMonths: [],
    topIndustryMonths: [],
    nextPeakMonth: null,
    daysToNextPeak: null,
    insight: null,
  });
}

describe('ClientSeasonalityHeatmap · setor', () => {
  it('diz que o setor está indisponível quando a consulta do setor falha', () => {
    cenario(new Error('rpc do setor falhou'));

    render(<ClientSeasonalityHeatmap clientId="cliente-1" ramoAtividade="cooperativa" />);

    expect(screen.getByText(/setor indisponível/)).toBeTruthy();
    expect(screen.queryByText(/setor sem amostra/)).toBeNull();
  });

  it('diz que o setor está sem amostra quando a consulta respondeu vazia', () => {
    cenario(undefined);

    render(<ClientSeasonalityHeatmap clientId="cliente-1" ramoAtividade="cooperativa" />);

    expect(screen.getByText(/setor sem amostra/)).toBeTruthy();
    expect(screen.queryByText(/setor indisponível/)).toBeNull();
  });
});
