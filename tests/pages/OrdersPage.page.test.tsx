/**
 * Fluxo real da tela de Pedidos: a falha de atualização tem de manter os
 * pedidos em tela e o aviso tem de sumir quando a retentativa dá certo.
 * Aqui a página é renderizada de verdade; só os filhos pesados são trocados.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useOrdersList: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});
vi.mock('@/hooks/orders/useOrders', () => ({
  useOrdersList: mocks.useOrdersList,
  ORDER_STATUS_LABELS: {},
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'vendedor-1' } }) }));
vi.mock('@/lib/auth/visibility-scope', () => ({ useSalesScope: () => ({}) }));
vi.mock('@/hooks/useRealtimeSync', () => ({ useRealtimeSync: () => undefined }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/utils/orderExportUtils', () => ({ exportToExcel: vi.fn(), exportToPDF: vi.fn() }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/common/PersistentBreadcrumbs', () => ({ PersistentBreadcrumbs: () => null }));
vi.mock('@/components/common/ScopeBadge', () => ({ ScopeBadge: () => null }));
vi.mock('@/components/orders/OrderStatsBar', () => ({ OrderStatsBar: () => null }));
vi.mock('@/components/orders/OrderFilters', () => ({ OrderFilters: () => null }));
vi.mock('@/components/orders/BatchExportDialog', () => ({ BatchExportDialog: () => null }));
vi.mock('@/components/orders/OrderCard', () => ({
  OrderCard: ({ order }: { order: { id: string } }) => <div>pedido {order.id}</div>,
}));

import { OrdersPage } from '@/pages/OrdersPage';

const pedido = { id: 'ord-1', status: 'enviado_gestor', total: 10, created_at: '2026-01-01T00:00:00Z' };

describe('OrdersPage', () => {
  it('mantém a lista na falha de atualização e remove o aviso quando a retentativa responde', () => {
    let falha = true;
    mocks.useOrdersList.mockImplementation(() => ({
      data: { data: [pedido], count: 1 },
      isLoading: false,
      isError: falha,
      refetch: () => {
        falha = false;
        mocks.refetch();
      },
    }));

    const { rerender } = render(<OrdersPage />);

    expect(screen.getByText('pedido ord-1')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar a lista');

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente a atualização da lista' }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);

    rerender(<OrdersPage />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('pedido ord-1')).toBeTruthy();
  });

  it('sem pedidos e com falha mostra a tela de erro, não a lista vazia', () => {
    mocks.useOrdersList.mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });

    render(<OrdersPage />);

    expect(screen.getByText('Não foi possível carregar seus pedidos')).toBeTruthy();
    expect(screen.queryByText('Você ainda não tem pedidos')).toBeNull();
  });
});
