import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancialPanel } from '@/components/orders/FinancialPanel';
import type { OrderRow } from '@/types/orders';

const order: OrderRow = {
  id: 'order-1',
  order_number: 'SCO-001',
  status: 'rascunho',
  fulfillment_status: 'pending',
  total: 105,
  subtotal: 100,
  discount_amount: 0,
  shipping_cost: 5,
  shipping_type: null,
  tracking_number: null,
  delivery_time: null,
  payment_terms: null,
  client_id: null,
  client_name: 'Cooperativa de teste',
  client_company: 'Cooperativa de teste',
  client_email: null,
  client_phone: null,
  notes: null,
  internal_notes: null,
  quote_id: null,
  seller_id: 'seller-1',
  organization_id: null,
  created_at: '2026-10-29T00:00:00.000Z',
  updated_at: '2026-10-29T00:00:00.000Z',
};

describe('FinancialPanel', () => {
  it('não inventa margem quando o pedido não contém custo dos itens', () => {
    render(<FinancialPanel order={order} />);

    expect(screen.getByText(/Margem não calculada/)).toBeInTheDocument();
    expect(screen.getByText(/custos dos itens não disponíveis/)).toBeInTheDocument();
    expect(screen.queryByText('32%')).not.toBeInTheDocument();
    expect(screen.getByText(/R\$\s*105,00/)).toBeInTheDocument();
  });
});
