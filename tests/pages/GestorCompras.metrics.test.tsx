/**
 * A tela de compras tem de mostrar número medido, nos quatro estados.
 *
 * Antes ela exibia valores fictícios fixos ("85%", "R$ 450.000,00"); eles foram
 * removidos por serem falsos e nada entrou no lugar — o gestor ficou sem
 * nenhum indicador na própria tela. Recupera os cenários da PR #157.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getCooperativeDashboardStats = vi.fn();
const loadPurchasingOrders = vi.fn();
const loadManagerApprovalHistory = vi.fn();
vi.mock('@/services/sicoob/managerStatsService', () => ({
  getCooperativeDashboardStats: (id?: string | null) => getCooperativeDashboardStats(id),
  loadPurchasingOrders: (...args: unknown[]) => loadPurchasingOrders(...args),
  loadManagerApprovalHistory: (...args: unknown[]) => loadManagerApprovalHistory(...args),
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

/** Pedidos do mês já aprovados, que é o universo que o SLA mede. */
function aprovados(count: number, linhas: number) {
  const base = pedidos(count, linhas);
  return { ...base, data: base.data.map((o) => ({ ...o, status: 'confirmed' as const })) };
}

function pedidos(count: number, linhas: number) {
  return {
    count,
    data: Array.from({ length: linhas }, (_, i) => ({
      id: `order-${i}`,
      status: 'waiting_approval' as const,
      total_amount: 1_000,
      created_at: '2026-10-13T08:00:00.000Z',
    })),
  };
}

describe('Indicadores na tela de Gestão de Compras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadPurchasingOrders.mockResolvedValue(pedidos(0, 0));
    loadManagerApprovalHistory.mockResolvedValue(new Map());
  });

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

  it('mostra travessão no SLA e no total do mês quando a consulta trunca', async () => {
    // 1.001 pedidos no banco, 1 linha devolvida: somar seria mostrar uma
    // fração como se fosse o total.
    getCooperativeDashboardStats.mockResolvedValue(statsCompletas);
    loadPurchasingOrders.mockResolvedValue(pedidos(1_001, 1));

    renderizar(<GestorComprasMetrics cooperativeId="coop-1" />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBe(2));
  });

  it('mostra o SLA medido quando o universo está completo', async () => {
    // Dois pedidos do mês já aprovados: um decidido em 2h, outro em 48h.
    getCooperativeDashboardStats.mockResolvedValue(statsCompletas);
    loadPurchasingOrders.mockResolvedValue(aprovados(2, 2));
    const base = Date.parse('2026-10-13T08:00:00.000Z');
    loadManagerApprovalHistory.mockResolvedValue(
      new Map([
        ['order-0', { submittedAtMs: base, decidedAtMs: base + 2 * 3_600_000 }],
        ['order-1', { submittedAtMs: base, decidedAtMs: base + 48 * 3_600_000 }],
      ]),
    );

    renderizar(<GestorComprasMetrics cooperativeId="coop-1" />);

    expect(await screen.findByText('50%')).toBeTruthy();
  });

  it('falha das métricas da fila avisa e oferece retentativa própria', async () => {
    // A retentativa da verba não cobre estes dois números: a falha da fila precisa
    // da própria saída, senão o gestor fica sem SLA e sem total do mês.
    getCooperativeDashboardStats.mockResolvedValue(statsCompletas);
    loadPurchasingOrders.mockRejectedValueOnce(new Error('fila indisponível'));
    loadPurchasingOrders.mockResolvedValue(pedidos(0, 0));

    renderizar(<GestorComprasMetrics cooperativeId="coop-1" />);

    expect(await screen.findByText('SLA e totais do mês indisponíveis')).toBeTruthy();
    expect(screen.getByText('A consulta falhou. Nenhum valor foi estimado.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(loadPurchasingOrders.mock.calls.length).toBeGreaterThan(1));
  });

  it('consulta só a cooperativa do perfil', async () => {
    // Sem o recorte, dev e supervisor veriam pedido de outra Singular somado
    // ao indicador desta.
    getCooperativeDashboardStats.mockResolvedValue(statsCompletas);
    loadPurchasingOrders.mockResolvedValue(aprovados(1, 1));
    loadManagerApprovalHistory.mockResolvedValue(new Map());

    renderizar(<GestorComprasMetrics cooperativeId="coop-1" />);

    await waitFor(() => expect(loadPurchasingOrders).toHaveBeenCalled());
    for (const chamada of loadPurchasingOrders.mock.calls) {
      expect(chamada[2]).toBe('coop-1');
    }
  });
});
