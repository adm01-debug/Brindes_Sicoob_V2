import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import { QuoteProductSelector } from '@/components/quotes/QuoteProductSelector';

describe('QuoteProductSelector durante salvamento', () => {
  it('fecha e não reabre o seletor quando a cotação deixa de aceitar edição', () => {
    const onAddWithColor = vi.fn();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <QuoteProductSelector
        canEdit={false}
        open
        onOpenChange={onOpenChange}
        productSearch=""
        setProductSearch={vi.fn()}
        filteredProducts={[]}
        selectedProductForColor={null}
        setSelectedProductForColor={vi.fn()}
        onProductClick={vi.fn()}
        onAddWithColor={onAddWithColor}
        formatCurrency={(value) => `R$ ${value}`}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onAddWithColor).not.toHaveBeenCalled();
  });
});
