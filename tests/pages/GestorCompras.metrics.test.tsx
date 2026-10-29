import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../test-utils';
import GestorCompras from '@/pages/GestorCompras';

const mocks = vi.hoisted(() => ({
  getStats: vi.fn(),
  profile: { cooperativa_id: 'coop-1' as string | null },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: mocks.profile }),
}));

vi.mock('@/services/sicoob/managerStatsService', () => ({
  managerStatsService: { getCooperativeDashboardStats: mocks.getStats },
}));

vi.mock('@/components/orders/ApprovalKanbanBoard', () => ({
  ApprovalKanbanBoard: () => <div>Quadro de aprovações</div>,
}));

vi.mock('@/components/orders/OrderConsolidationPanel', () => ({
  OrderConsolidationPanel: () => <div>Consolidação</div>,
}));

vi.mock('@/components/orders/SmartAlertsPanel', () => ({
  SmartAlertsPanel: () => <div>Alertas operacionais</div>,
}));

vi.mock('@/pages/OrdersPage', () => ({
  OrdersPage: () => <div>Lista de pedidos</div>,
}));

describe('GestorCompras: indicadores operacionais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile.cooperativa_id = 'coop-1';
  });

  it('exibe contagens e orçamento da cooperativa retornados pelo serviço', async () => {
    mocks.getStats.mockResolvedValue({
      totalPAs: 14,
      pendingApprovals: 3,
      monthlyBudget: 120000,
      totalSpentMonth: 45000,
      hasConfiguredBudget: true,
      recentOrders: [],
    });

    render(<GestorCompras />);

    expect(await screen.findByTestId('pending-approvals-count')).toHaveTextContent('3');
    expect(screen.getByTestId('cooperative-pa-count')).toHaveTextContent('14');
    expect(screen.getByText(/120\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/45\.000,00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir fila de aprovações' })).toHaveAttribute(
      'href',
      '/gestor/aprovacoes',
    );
    expect(screen.queryByText('85%')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 450.000,00')).not.toBeInTheDocument();
    expect(mocks.getStats).toHaveBeenCalledWith('coop-1');
  });

  it('não substitui falha de consulta por métricas estimadas', async () => {
    mocks.getStats.mockRejectedValue(new Error('Falha de conexão'));

    render(<GestorCompras />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('não foram substituídos por estimativas');
    });
    expect(screen.queryByText('85%')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 450.000,00')).not.toBeInTheDocument();
  });

  it('não consulta nem presume valores quando o perfil não tem cooperativa', async () => {
    mocks.profile.cooperativa_id = null;
    mocks.getStats.mockResolvedValue(null);

    render(<GestorCompras />);

    expect(await screen.findByText('Cooperativa não vinculada ao perfil.')).toBeInTheDocument();
    expect(
      screen.queryByText('Nenhuma verba mensal foi cadastrada para esta cooperativa.'),
    ).not.toBeInTheDocument();
    expect(mocks.getStats).not.toHaveBeenCalled();
  });
});
