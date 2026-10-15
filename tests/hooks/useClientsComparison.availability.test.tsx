import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  company: vi.fn(),
  health: vi.fn(),
  bi: vi.fn(),
  seasonality: vi.fn(),
  affinity: vi.fn(),
  categoryAffinity: vi.fn(),
  categoryIndustry: vi.fn(),
}));

vi.mock('@/hooks/useCrmCompanies', () => ({ useCrmCompanyStrict: mocks.company }));
vi.mock('@/hooks/bi/useClientHealthScore', () => ({ useClientHealthScore: mocks.health }));
vi.mock('@/hooks/bi/useClientBI', () => ({ useClientBI: mocks.bi }));
vi.mock('@/hooks/bi/useClientSeasonality', () => ({ useClientSeasonality: mocks.seasonality }));
vi.mock('@/hooks/bi/useClientAffinity', () => ({ useClientAffinity: mocks.affinity }));
vi.mock('@/hooks/bi/useClientCategoryAffinity', () => ({ useClientCategoryAffinity: mocks.categoryAffinity }));
vi.mock('@/hooks/bi/useIndustryCategoryTrends', () => ({ useIndustryCategoryTrends: mocks.categoryIndustry }));

import { useSingleClientComparisonRow } from '@/hooks/bi/useClientsComparison';

function sourceState(overrides: Record<string, unknown> = {}) {
  return {
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('useSingleClientComparisonRow — disponibilidade por fonte', () => {
  beforeEach(() => {
    mocks.company.mockReset().mockReturnValue(sourceState({
      data: { id: 'cliente-1', razao_social: 'Cooperativa Alpha', ramo_atividade: 'Crédito' },
    }));
    mocks.health.mockReset().mockReturnValue(sourceState({
      score: 84,
      tier: 'healthy',
      shareOfWalletPct: 42,
    }));
    mocks.bi.mockReset().mockReturnValue({
      ...sourceState(),
      isUnavailable: false,
      ltv: 12_000,
      avgTicket: 2_000,
      ordersCount: 6,
      daysSinceLastOrder: 12,
      topCategories: [{ category: 'Fallback BI' }],
    });
    mocks.seasonality.mockReset().mockReturnValue(sourceState({
      industryError: null,
      hasEnoughData: true,
      daysToNextPeak: 30,
      nextPeakMonth: 11,
    }));
    mocks.affinity.mockReset().mockReturnValue(sourceState({
      data: { categories: [{ category: 'Canetas' }] },
    }));
    mocks.categoryAffinity.mockReset().mockReturnValue(sourceState({
      favorite: { slug: 'canecas', label: 'Canecas', revenueSharePct: 55 },
      categories: [{ slug: 'canecas', label: 'Canecas', revenueSharePct: 55 }],
    }));
    mocks.categoryIndustry.mockReset().mockReturnValue(sourceState({
      categories: [{ slug: 'mochilas', label: 'Mochilas', revenueSharePct: 24 }],
    }));
  });

  it('descarta afinidade em cache após falha e usa histórico confiável como fallback', async () => {
    const retryAffinity = vi.fn(async () => undefined);
    mocks.affinity.mockReturnValue(sourceState({
      isError: true,
      error: new Error('afinidade indisponível'),
      data: { categories: [{ category: 'Canetas em cache' }] },
      refetch: retryAffinity,
    }));
    mocks.categoryAffinity.mockReturnValue(sourceState({ favorite: null, categories: [] }));

    const { result } = renderHook(() => useSingleClientComparisonRow('cliente-1'));

    expect(result.current.failedSources).toEqual(['afinidade']);
    expect(result.current.unavailable).toMatchObject({
      health: false,
      history: false,
      topCategory: false,
      favoriteCategory: false,
      opportunityCategory: false,
      seasonality: false,
    });
    expect(result.current).toMatchObject({
      score: 84,
      ltv: 12_000,
      topCategory: 'Fallback BI',
      nextPeakLabel: '30d',
    });

    await act(async () => { await result.current.refetch(); });
    expect(retryAffinity).toHaveBeenCalledOnce();
  });

  it('isola falhas de categoria e usa a afinidade confiável como fallback do topo', async () => {
    const retryClientCategories = vi.fn(async () => undefined);
    const retryIndustryCategories = vi.fn(async () => undefined);
    mocks.categoryAffinity.mockReturnValue(sourceState({
      isError: true,
      error: new Error('categorias do cliente indisponíveis'),
      refetch: retryClientCategories,
      favorite: { slug: 'canecas', label: 'Canecas em cache', revenueSharePct: 55 },
      categories: [{ slug: 'canecas', label: 'Canecas em cache', revenueSharePct: 55 }],
    }));
    mocks.categoryIndustry.mockReturnValue(sourceState({
      isError: true,
      error: new Error('categorias do setor indisponíveis'),
      refetch: retryIndustryCategories,
      categories: [{ slug: 'mochilas', label: 'Mochilas em cache', revenueSharePct: 24 }],
    }));

    const { result } = renderHook(() => useSingleClientComparisonRow('cliente-1'));

    expect(result.current.failedSources).toEqual(['categorias do cliente', 'categorias do setor']);
    expect(result.current.unavailable).toMatchObject({
      health: false,
      history: false,
      topCategory: false,
      favoriteCategory: true,
      opportunityCategory: true,
      seasonality: false,
    });
    expect(result.current.topCategory).toBe('Canetas');
    expect(result.current.favoriteCategoryLabel).toBeNull();
    expect(result.current.opportunityCategoryLabel).toBeNull();
    expect(result.current.ltv).toBe(12_000);

    await act(async () => { await result.current.refetch(); });
    expect(retryClientCategories).toHaveBeenCalledOnce();
    expect(retryIndustryCategories).toHaveBeenCalledOnce();
  });

  it('propaga CRM indisponível para métricas dependentes e permite retry', async () => {
    const retryCrm = vi.fn(async () => undefined);
    const crmError = new Error('CRM indisponível');
    mocks.company.mockReturnValue(sourceState({
      data: { id: 'cliente-1', razao_social: 'Cooperativa em cache', ramo_atividade: 'Crédito' },
      isError: true,
      error: crmError,
      refetch: retryCrm,
    }));

    const { result } = renderHook(() => useSingleClientComparisonRow('cliente-1'));

    expect(result.current.error).toBe(crmError);
    expect(result.current.failedSources).toEqual(['cadastro CRM']);
    expect(result.current.unavailable).toMatchObject({
      health: true,
      history: false,
      opportunityCategory: true,
      seasonality: true,
    });
    expect(result.current.ltv).toBe(12_000);

    await act(async () => { await result.current.refetch(); });
    expect(retryCrm).toHaveBeenCalledOnce();
  });

  it('isola falha própria do Health Score e preserva histórico, categorias e pico', async () => {
    const retryHealth = vi.fn(async () => undefined);
    mocks.health.mockReturnValue(sourceState({
      isError: true,
      error: new Error('benchmark indisponível'),
      refetch: retryHealth,
      score: 0,
      tier: 'unknown',
      shareOfWalletPct: 0,
    }));

    const { result } = renderHook(() => useSingleClientComparisonRow('cliente-1'));

    expect(result.current.failedSources).toEqual(['Health Score']);
    expect(result.current.unavailable).toMatchObject({
      health: true,
      history: false,
      topCategory: false,
      seasonality: false,
    });
    expect(result.current).toMatchObject({ ltv: 12_000, topCategory: 'Canecas', nextPeakLabel: '30d' });

    await act(async () => { await result.current.refetch(); });
    expect(retryHealth).toHaveBeenCalledOnce();
  });

  it('propaga falha de sazonalidade uma única vez e preserva fontes independentes', async () => {
    const retrySeasonality = vi.fn(async () => undefined);
    const retryHealth = vi.fn(async () => undefined);
    mocks.seasonality.mockReturnValue(sourceState({
      isError: true,
      error: new Error('sazonalidade indisponível'),
      refetch: retrySeasonality,
      industryError: null,
      hasEnoughData: true,
      daysToNextPeak: 30,
      nextPeakMonth: 11,
    }));
    mocks.health.mockReturnValue(sourceState({
      isError: true,
      error: new Error('score depende da sazonalidade'),
      refetch: retryHealth,
      score: 0,
      tier: 'unknown',
      shareOfWalletPct: 0,
    }));

    const { result } = renderHook(() => useSingleClientComparisonRow('cliente-1'));

    expect(result.current.failedSources).toEqual(['sazonalidade']);
    expect(result.current.unavailable).toMatchObject({
      health: true,
      history: false,
      topCategory: false,
      seasonality: true,
    });
    expect(result.current).toMatchObject({ ltv: 12_000, topCategory: 'Canecas' });
    expect(result.current.nextPeakLabel).toBe('—');
    expect(result.current.daysToNextPeak).toBeNull();

    await act(async () => { await result.current.refetch(); });
    expect(retrySeasonality).toHaveBeenCalledOnce();
    expect(retryHealth).toHaveBeenCalledOnce();
  });

  it('não publica pico do cliente quando a fonte setorial da sazonalidade falha', () => {
    mocks.seasonality.mockReturnValue(sourceState({
      industryError: new Error('sazonalidade do setor indisponível'),
      hasEnoughData: true,
      daysToNextPeak: 30,
      nextPeakMonth: 11,
    }));

    const { result } = renderHook(() => useSingleClientComparisonRow('cliente-1'));

    expect(result.current.failedSources).toEqual(['sazonalidade']);
    expect(result.current.unavailable.seasonality).toBe(true);
    expect(result.current.unavailable.history).toBe(false);
    expect(result.current.ltv).toBe(12_000);
    expect(result.current.nextPeakLabel).toBe('—');
  });
});
