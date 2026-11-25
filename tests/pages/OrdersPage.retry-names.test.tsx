/**
 * Quando a lista e as estatísticas falham juntas existem dois "Tentar
 * novamente" em tela: os nomes acessíveis precisam dizer qual consulta cada
 * botão refaz.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useOrdersList: vi.fn(), refetch: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams(), vi.fn()] };
});
vi.mock('@/hooks/orders/useOrders', () => ({ useOrdersList: mocks.useOrdersList, ORDER_STATUS_LABELS: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'vendedor-1' } }) }));
vi.mock('@/lib/auth/visibility-scope', () => ({ useSalesScope: () => ({}) }));
vi.mock('@/hooks/useRealtimeSync', () => ({ useRealtimeSync: () => undefined }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/utils/orderExportUtils', () => ({ exportToExcel: vi.fn(), exportToPDF: vi.fn() }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/common/PersistentBreadcrumbs', () => ({ PersistentBreadcrumbs: () => null }));
vi.mock('@/components/common/ScopeBadge', () => ({ ScopeBadge: () => null }));
vi.mock('@/components/orders/OrderFilters', () => ({ OrderFilters: () => null }));
vi.mock('@/components/orders/BatchExportDialog', () => ({ BatchExportDialog: () => null }));
vi.mock('@/components/orders/OrderCard', () => ({ OrderCard: () => null }));

import { OrdersPage } from '@/pages/OrdersPage';

describe('OrdersPage — dois botões de retentativa', () => {
  it('dá nome próprio ao botão das estatísticas e ao da lista', () => {
    mocks.useOrdersList.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: mocks.refetch });

    render(<OrdersPage />);

    const estatisticas = screen.getByRole('button', { name: 'Tentar novamente as estatísticas' });
    const lista = screen.getByRole('button', { name: 'Tentar novamente o carregamento dos pedidos' });
    expect(estatisticas).not.toBe(lista);
    // Nenhum botão fica com o nome genérico repetido.
    expect(screen.queryAllByRole('button', { name: 'Tentar novamente' })).toHaveLength(0);
  });
});
