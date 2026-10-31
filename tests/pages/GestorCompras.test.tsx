import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { cooperativa_id: 'cooperativa-teste' } }),
}));
vi.mock('@/components/orders/ApprovalKanbanBoard', () => ({
  ApprovalKanbanBoard: () => <div>Kanban de aprovações</div>,
}));
vi.mock('@/components/orders/OrderConsolidationPanel', () => ({
  OrderConsolidationPanel: () => <div>Consolidação de pedidos</div>,
}));
vi.mock('@/components/orders/SmartAlertsPanel', () => ({
  SmartAlertsPanel: () => <div>Alertas atuais</div>,
}));
vi.mock('@/pages/OrdersPage', () => ({
  OrdersPage: () => <div>Pedidos atuais</div>,
}));

import GestorCompras from '@/pages/GestorCompras';

describe('Gestão de Compras da Singular', () => {
  it('não exibe métricas inventadas nem ação de aprovação fictícia', () => {
    render(
      <MemoryRouter>
        <GestorCompras />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Pedidos pendentes hoje')).not.toBeInTheDocument();
    expect(screen.queryByText('SLA de aprovação (24h)')).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$ 450\.000,00/)).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$ 380\.000,00/)).not.toBeInTheDocument();
    expect(screen.queryByText('Aprovação em Lote (SLA Rápido)')).not.toBeInTheDocument();
  });

  it('direciona o gestor para a fila real e para os indicadores da Singular', () => {
    render(
      <MemoryRouter>
        <GestorCompras />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Abrir fila de aprovações' })).toHaveAttribute(
      'href',
      '/gestor/aprovacoes',
    );
    expect(screen.getByRole('link', { name: 'Abrir painel de indicadores' })).toHaveAttribute(
      'href',
      '/gestor',
    );
  });
});
