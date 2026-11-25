/**
 * Falha de consulta na tela de Pedidos não pode virar lista vazia nem apagar
 * os pedidos que já estão na tela: a falha de atualização é aviso, não tela de erro.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Order } from '@/hooks/orders/useOrders';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/orders/OrderCard', () => ({
  OrderCard: ({ order }: { order: Order }) => <div>pedido {order.id}</div>,
}));

import { OrdersContent } from '@/pages/OrdersPage';

const pedido = { id: 'ord-1' } as Order;

describe('OrdersContent', () => {
  it('falha sem pedidos carregados diz que a consulta falhou, e não que a lista está vazia', () => {
    const onRetry = vi.fn();

    render(<OrdersContent orders={[]} isLoading={false} isError onRetry={onRetry} search="" />);

    expect(screen.getByText('Não foi possível carregar seus pedidos')).toBeTruthy();
    expect(screen.getByText(/isto não é uma lista vazia/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('falha de atualização não apaga os pedidos já carregados', () => {
    const onRetry = vi.fn();

    render(
      <OrdersContent orders={[pedido]} isLoading={false} isError onRetry={onRetry} search="" />,
    );

    expect(screen.getByText('pedido ord-1')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar a lista');
    expect(screen.queryByText('Não foi possível carregar seus pedidos')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('consulta bem-sucedida não mostra aviso nenhum', () => {
    render(<OrdersContent orders={[pedido]} isLoading={false} search="" />);

    expect(screen.getByText('pedido ord-1')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
