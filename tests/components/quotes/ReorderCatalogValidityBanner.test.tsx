import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
      })),
    })),
  },
}));

vi.mock('@/services/sicoob/orderService', () => ({
  sicoobOrderService: { revalidateReorderQuote: mocks.revalidate },
}));

import { ReorderCatalogValidityBanner } from '@/components/quotes/ReorderCatalogValidityBanner';

describe('ReorderCatalogValidityBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({
      data: {
        reorder_source_order_id: 'pedido-1',
        reorder_source_quote_id: null,
        catalog_revalidated_at: '2026-09-27T12:00:00.000Z',
        catalog_valid_until: '2026-09-27T12:05:00.000Z',
        catalog_stock_is_reserved: false,
        reorder_price_changed_items: 1,
      },
      error: null,
    });
    mocks.revalidate.mockResolvedValue({
      catalogValidUntil: '2099-09-27T12:05:00.000Z',
      priceChangedItems: 1,
      stockIsReserved: false,
    });
  });

  it('explica validade, mudança de preço e ausência de reserva', async () => {
    render(<ReorderCatalogValidityBanner quoteId="quote-1" />);

    expect(await screen.findByText('Revalide preço e disponibilidade')).toBeInTheDocument();
    expect(screen.getByText(/não reserva estoque no fornecedor/i)).toBeInTheDocument();
    expect(screen.getByText(/1 item\(ns\) mudaram de preço/i)).toBeInTheDocument();
  });

  it('reconsulta o servidor e atualiza a tela somente depois da confirmação', async () => {
    const onRevalidated = vi.fn();
    render(<ReorderCatalogValidityBanner quoteId="quote-1" onRevalidated={onRevalidated} />);

    fireEvent.click(await screen.findByRole('button', { name: /reconsultar agora/i }));

    await waitFor(() => {
      expect(mocks.revalidate).toHaveBeenCalledWith('quote-1');
      expect(onRevalidated).toHaveBeenCalledTimes(1);
    });
  });

  it('protege alterações locais ainda não salvas', async () => {
    render(<ReorderCatalogValidityBanner quoteId="quote-1" hasUnsavedChanges />);

    expect(await screen.findByText(/salve ou descarte as alterações locais/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reconsultar agora/i })).toBeDisabled();
  });

  it('não revalida uma versão histórica ou somente leitura', async () => {
    render(<ReorderCatalogValidityBanner quoteId="quote-1" canRevalidate={false} />);

    expect(await screen.findByText(/reabra a versão vigente/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /reconsultar agora/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
