import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const readiness = vi.hoisted(() => ({
  data: null as null | {
    status: 'pending' | 'approved' | 'rejected' | 'revision';
    version: number;
  },
  isLoading: false,
  error: null as Error | null,
}));

vi.mock('@/hooks/orders/extensions', () => ({
  useOrderProductionReadiness: () => readiness,
}));

import { OrderProductionReadiness } from '@/components/sicoob/orders/OrderProductionReadiness';

describe('pré-requisitos de produção do pedido Sicoob', () => {
  beforeEach(() => {
    readiness.data = null;
    readiness.isLoading = false;
    readiness.error = null;
  });

  it('não confunde arte aprovada com autorização da despesa', () => {
    readiness.data = { status: 'approved', version: 3 };

    render(<OrderProductionReadiness orderId="pedido-1" orderStatus="pending" requiresArtwork />);

    expect(screen.getByText('Produção ainda não liberada')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
    expect(screen.getByText('Aprovada · v3')).toBeTruthy();
    expect(screen.getByText(/decisões independentes/i)).toBeTruthy();
  });

  it('mantém a produção bloqueada quando a despesa foi autorizada e a arte vigente está pendente', () => {
    readiness.data = { status: 'pending', version: 4 };

    render(<OrderProductionReadiness orderId="pedido-2" orderStatus="confirmed" requiresArtwork />);

    expect(screen.getByText('Produção ainda não liberada')).toBeTruthy();
    expect(screen.getByText('Autorizada')).toBeTruthy();
    expect(screen.getByText('Aguardando aprovação · v4')).toBeTruthy();
  });

  it('declara prontidão somente quando todos os pré-requisitos exigidos foram atendidos', () => {
    readiness.data = { status: 'approved', version: 5 };

    render(<OrderProductionReadiness orderId="pedido-3" orderStatus="confirmed" requiresArtwork />);

    expect(screen.getByText('Pré-requisitos de produção atendidos')).toBeTruthy();
    expect(screen.getByText('Autorizada')).toBeTruthy();
    expect(screen.getByText('Aprovada · v5')).toBeTruthy();
  });

  it('aguarda a consulta antes de concluir que nenhuma arte é exigida', () => {
    readiness.isLoading = true;

    render(
      <OrderProductionReadiness
        orderId="pedido-4"
        orderStatus="confirmed"
        requiresArtwork={false}
      />,
    );

    expect(screen.getByText('Produção ainda não liberada')).toBeTruthy();
    expect(screen.getByText('Verificando…')).toBeTruthy();
  });

  it('libera pedido autorizado quando a consulta confirma que arte não é exigida', () => {
    render(
      <OrderProductionReadiness
        orderId="pedido-5"
        orderStatus="confirmed"
        requiresArtwork={false}
      />,
    );

    expect(screen.getByText('Pré-requisitos de produção atendidos')).toBeTruthy();
    expect(screen.getByText('Não exigida')).toBeTruthy();
  });

  it('não inventa decisão quando a consulta de arte falha', () => {
    readiness.data = null;
    readiness.error = new Error('indisponível');

    render(<OrderProductionReadiness orderId="pedido-6" orderStatus="confirmed" requiresArtwork />);

    expect(screen.getByText('Produção ainda não liberada')).toBeTruthy();
    expect(screen.getByText('Consulta indisponível')).toBeTruthy();
  });
});
