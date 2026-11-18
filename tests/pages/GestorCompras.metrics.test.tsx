/**
 * A tela de compras tem de mostrar número medido, nos quatro estados.
 *
 * Antes ela exibia valores fictícios fixos ("85%", "R$ 450.000,00"); eles foram
 * removidos por serem falsos e nada entrou no lugar — o gestor ficou sem
 * nenhum indicador na própria tela. Recupera os cenários da PR #157.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getCooperativeDashboardStats = vi.fn();
vi.mock('@/services/sicoob/managerStatsService', () => ({
  getCooperativeDashboardStats: (id?: string | null) => getCooperativeDashboardStats(id),
}));

import { GestorComprasMetrics } from '@/components/sicoob/GestorComprasMetrics';

function renderizar(no: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{no}</QueryClientProvider>);
}

const statsCompletas = {
  totalPAs: 14,
  pendingApprovals: 3,
  totalSpentMonth: 45_000,
  monthlyBudget: 120_000,
  hasConfiguredBudget: true,
  recentOrders: [],
};

describe('Indicadores na tela de Gestão de Compras', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra os números que vêm do serviço, e nenhum valor fictício', async () => {
    getCooperativeDashboardStats.mockResolvedValue(statsCompletas);

    renderizar(<GestorComprasMetrics cooperativeId="coop-1" />);

    expect(await screen.findByText('3')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('38');
    expect(screen.queryByText('85%')).toBeNull();
    expect(screen.queryByText(/R\$ 450\.000,00/)).toBeNull();
  });

  it('falha na consulta avisa e não inventa estimativa', async () => {
    getCooperativeDashboardStats.mockRejectedValue(new Error('indisponível'));

    renderizar(<GestorComprasMetrics cooperativeId="coop-1" />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Os valores não foram substituídos por estimativas.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('cooperativa sem verba cadastrada diz isso, em vez de mostrar zero', async () => {
    getCooperativeDashboardStats.mockResolvedValue({
      ...statsCompletas,
      hasConfiguredBudget: false,
      monthlyBudget: 0,
      totalSpentMonth: 0,
    });

    renderizar(<GestorComprasMetrics cooperativeId="coop-1" />);

    expect(
      await screen.findByText('Nenhuma verba mensal foi cadastrada para esta cooperativa.'),
    ).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('perfil sem cooperativa não dispara consulta nenhuma', async () => {
    renderizar(<GestorComprasMetrics cooperativeId={null} />);

    expect(screen.getByText('Cooperativa não vinculada ao perfil.')).toBeTruthy();
    await waitFor(() => expect(getCooperativeDashboardStats).not.toHaveBeenCalled());
  });
});
