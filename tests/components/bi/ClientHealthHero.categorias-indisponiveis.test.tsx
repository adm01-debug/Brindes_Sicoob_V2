/**
 * Regressão: com a consulta de categorias do cliente falhando, a lista vazia
 * fazia toda categoria do setor virar "oportunidade" na tela do vendedor.
 */
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../render-helpers';

const mocks = vi.hoisted(() => ({
  health: {} as Record<string, unknown>,
  clientCats: {} as Record<string, unknown>,
}));

vi.mock('@/hooks/bi/useClientHealthScore', () => ({ useClientHealthScore: () => mocks.health }));
vi.mock('@/hooks/bi/useClientAffinity', () => ({ useClientAffinity: () => ({ data: { categories: [] } }) }));
vi.mock('@/hooks/bi/useIndustryTrends', () => ({ useIndustryTrends: () => ({ data: { trends: [] } }) }));
vi.mock('@/hooks/bi/useClientCategoryAffinity', () => ({ useClientCategoryAffinity: () => mocks.clientCats }));
vi.mock('@/hooks/bi/useIndustryCategoryTrends', () => ({
  useIndustryCategoryTrends: () => ({
    isError: false,
    categories: [{ slug: 'canetas', label: 'Canetas', revenueSharePct: 42 }],
  }),
}));

import { ClientHealthHero } from '@/components/bi/ClientHealthHero';

describe('ClientHealthHero — categorias do cliente indisponíveis', () => {
  beforeEach(() => {
    mocks.health = {
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
      unavailableReason: null, tier: 'healthy', score: 80,
      breakdown: {
        recency: { score: 100, weight: 30, label: 'Recência' },
        frequency: { score: 80, weight: 25, label: 'Frequência' },
        ticket: { score: 70, weight: 20, label: 'Ticket vs setor' },
        growth: { score: 50, weight: 15, label: 'Crescimento' },
        shareOfWallet: { score: 40, weight: 10, label: 'Share-of-wallet' },
      },
      shareOfWalletPct: 40, potentialUntappedBRL: 1000, growthPct: 5,
      nextActionLabel: 'Manter cadência', nextActionDetail: 'ok', scriptHint: 'oi',
      windowLabel: 'janela', crossZoneInsight: 'insight', ctaLabel: 'Criar orçamento', ctaUrgent: false,
    };
    mocks.clientCats = { isError: true, categories: [], favorite: null };
  });

  it('não apresenta categoria do setor como oportunidade quando a do cliente falhou', () => {
    renderWithProviders(
      <ClientHealthHero clientId="c1" clientName="Cooperativa Alpha" ramoAtividade="Crédito" />,
    );

    expect(screen.queryByText(/Canetas/)).toBeNull();
  });

  it('volta a apresentar a oportunidade quando a consulta do cliente responde', () => {
    mocks.clientCats = { isError: false, categories: [], favorite: null };

    renderWithProviders(
      <ClientHealthHero clientId="c1" clientName="Cooperativa Alpha" ramoAtividade="Crédito" />,
    );

    expect(screen.getAllByText(/Canetas/).length).toBeGreaterThan(0);
  });
});
