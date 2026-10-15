import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FinancialPanel } from '@/components/orders/FinancialPanel';
import { OrderBudgetIntelligence } from '@/components/sicoob/orders/OrderBudgetIntelligence';
import { isDemoMode } from '@/pages/trends/is-demo-mode';
import { isOrderOverPaBudget, resolvePaBudgetState } from '@/lib/sicoob/paBudgetState';
import type { OrderRow } from '@/types/orders';

const order: OrderRow = {
  id: 'order-1',
  order_number: 'PED-1',
  status: 'rascunho',
  fulfillment_status: 'pending',
  total: 100,
  subtotal: 90,
  discount_amount: 0,
  shipping_cost: 10,
  shipping_type: null,
  tracking_number: null,
  delivery_time: null,
  payment_terms: null,
  client_id: null,
  client_name: null,
  client_company: null,
  client_email: null,
  client_phone: null,
  notes: null,
  internal_notes: null,
  quote_id: null,
  seller_id: 'seller-1',
  organization_id: null,
  created_at: '2026-10-13T00:00:00.000Z',
  updated_at: '2026-10-13T00:00:00.000Z',
};

describe('integridade dos indicadores comerciais', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('só ativa dados fictícios de tendências por solicitação explícita', () => {
    window.history.replaceState({}, '', '/tendencias');
    expect(isDemoMode()).toBe(false);

    window.history.replaceState({}, '', '/tendencias?demo=1');
    expect(isDemoMode()).toBe(true);

    window.history.replaceState({}, '', '/tendencias?demo=0');
    expect(isDemoMode()).toBe(false);
  });

  it('não inventa margem quando o pedido não armazena custos', () => {
    render(<FinancialPanel order={order} />);

    expect(screen.getByText('não calculada neste pedido')).toBeTruthy();
    expect(screen.queryByText('32%')).toBeNull();
  });

  it('não presume verba quando a competência não foi configurada', () => {
    render(
      <OrderBudgetIntelligence
        orderTotal={12_000}
        remainingBudget={0}
        allocatedBudget={null}
        paName="PA Centro"
      />,
    );

    expect(screen.getByText('Verba não configurada')).toBeTruthy();
    expect(screen.getByText('Análise indisponível')).toBeTruthy();
    expect(screen.getByText(/não presume um limite financeiro/i)).toBeTruthy();
    expect(screen.queryByText(/50\.000/)).toBeNull();
    expect(screen.queryByText('Viabilidade Confirmada')).toBeNull();
  });

  it('não trata carregamento, erro ou ausência de PA como verba zero', () => {
    const loadingState = resolvePaBudgetState({ isLoading: true, hasError: false, hasPaId: true, hasBudget: false });
    const errorState = resolvePaBudgetState({ isLoading: false, hasError: true, hasPaId: true, hasBudget: false });
    const missingPaState = resolvePaBudgetState({ isLoading: false, hasError: false, hasPaId: false, hasBudget: false });

    expect(isOrderOverPaBudget(loadingState, 12_000, 0)).toBeNull();
    expect(isOrderOverPaBudget(errorState, 12_000, 0)).toBeNull();
    expect(isOrderOverPaBudget(missingPaState, 12_000, 0)).toBeNull();
  });

  it('mostra carregamento sem exibir saldo ou decisão financeira', () => {
    render(
      <OrderBudgetIntelligence
        orderTotal={12_000}
        remainingBudget={0}
        allocatedBudget={null}
        paName="PA Centro"
        isLoading
      />,
    );

    expect(screen.getByRole('status').textContent).toContain('Consultando verba');
    expect(screen.queryByText('Saldo Disponível')).toBeNull();
    expect(screen.queryByText('Verba não configurada')).toBeNull();
    expect(screen.queryByText('Alerta de Limite Excedido')).toBeNull();
  });

  it('expõe erro de consulta e permite tentar novamente sem presumir falta de verba', () => {
    const onRetry = vi.fn();
    render(
      <OrderBudgetIntelligence
        orderTotal={12_000}
        remainingBudget={0}
        allocatedBudget={null}
        paName="PA Centro"
        hasError
        hasPaId
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('O saldo não foi presumido');
    expect(screen.queryByText('Verba não configurada')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('distingue PA ausente de consulta bem-sucedida sem verba cadastrada', () => {
    render(
      <OrderBudgetIntelligence
        orderTotal={12_000}
        remainingBudget={0}
        allocatedBudget={null}
        paName="PA Sicoob"
        hasPaId={false}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('PA não identificado');
    expect(screen.queryByText('Verba não configurada')).toBeNull();
    expect(screen.queryByText('Saldo Disponível')).toBeNull();
  });
});
