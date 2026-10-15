import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../render-helpers';

const mocks = vi.hoisted(() => ({
  health: {} as Record<string, unknown>,
  refetchHealth: vi.fn(),
}));

vi.mock('@/hooks/bi/useClientHealthScore', () => ({
  useClientHealthScore: () => mocks.health,
}));
vi.mock('@/hooks/bi/useClientAffinity', () => ({
  useClientAffinity: () => ({ data: { categories: [] } }),
}));
vi.mock('@/hooks/bi/useIndustryTrends', () => ({
  useIndustryTrends: () => ({ data: { trends: [] } }),
}));
vi.mock('@/hooks/bi/useClientCategoryAffinity', () => ({
  useClientCategoryAffinity: () => ({ favorite: null, categories: [] }),
}));
vi.mock('@/hooks/bi/useIndustryCategoryTrends', () => ({
  useIndustryCategoryTrends: () => ({ categories: [] }),
}));

import { ClientHealthHero } from '@/components/bi/ClientHealthHero';

describe('ClientHealthHero — disponibilidade do diagnóstico', () => {
  beforeEach(() => {
    mocks.refetchHealth.mockReset().mockResolvedValue(undefined);
    mocks.health = {
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetchHealth,
      unavailableReason: 'insufficient-data',
      tier: 'unknown',
    };
  });

  it('mostra falha da fonte com retry antes de qualquer conteúdo derivado', async () => {
    mocks.health = {
      ...mocks.health,
      isError: true,
      error: new Error('benchmark indisponível'),
      unavailableReason: 'source-error',
    };

    renderWithProviders(
      <ClientHealthHero clientId="cliente-1" clientName="Cooperativa Alpha" ramoAtividade="Crédito" />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Diagnóstico indisponível');
    expect(screen.queryByText('Health Score')).toBeNull();
    expect(screen.queryByText('Share-of-wallet')).toBeNull();
    expect(screen.queryByText(/Criar orçamento/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(mocks.refetchHealth).toHaveBeenCalledTimes(1));
  });

  it('distingue amostra insuficiente de falha e não oferece retry sem erro', () => {
    renderWithProviders(
      <ClientHealthHero clientId="cliente-1" clientName="Cooperativa Alpha" ramoAtividade="Crédito" />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Dados insuficientes para o diagnóstico');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    expect(screen.queryByText('Health Score')).toBeNull();
    expect(screen.queryByText('Share-of-wallet')).toBeNull();
  });
});
