import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
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

// A tela passou a ler indicadores reais por react-query (GestorComprasMetrics),
// então precisa de um QueryClient. O serviço é mockado em
// tests/pages/GestorCompras.metrics.test.tsx; aqui só não pode quebrar.
function renderizar(no: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{no}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Gestão de Compras da Singular', () => {
  it('não exibe métricas inventadas nem ação de aprovação fictícia', () => {
    renderizar(<GestorCompras />);

    expect(screen.queryByText('Pedidos pendentes hoje')).toBeNull();
    expect(screen.queryByText('SLA de aprovação (24h)')).toBeNull();
    expect(screen.queryByText(/R\$ 450\.000,00/)).toBeNull();
    expect(screen.queryByText(/R\$ 380\.000,00/)).toBeNull();
    expect(screen.queryByText('Aprovação em Lote (SLA Rápido)')).toBeNull();
  });

  it('direciona o gestor para a fila real e para os indicadores da Singular', () => {
    renderizar(<GestorCompras />);

    expect(
      screen.getByRole('link', { name: 'Abrir fila de aprovações' }).getAttribute('href'),
    ).toBe('/gestor/aprovacoes');
    expect(
      screen.getByRole('link', { name: 'Abrir painel de indicadores' }).getAttribute('href'),
    ).toBe('/gestor');
  });
});
