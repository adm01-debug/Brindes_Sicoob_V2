import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import { QuoteProductSelector } from '@/components/quotes/QuoteProductSelector';
import { QuoteBuilderDialogs } from '@/pages/QuoteBuilderPage';

const baseProps = {
  onOpenChange: vi.fn(),
  productSearch: '',
  setProductSearch: vi.fn(),
  filteredProducts: [],
  selectedProductForColor: null,
  setSelectedProductForColor: vi.fn(),
  onProductClick: vi.fn(),
  onAddWithColor: vi.fn(),
  formatCurrency: (value: number) => `R$ ${value}`,
};

type EstadoDoBuilder = Parameters<typeof QuoteBuilderDialogs>[0]['state'];

function estadoDoBuilder(canEdit: boolean): EstadoDoBuilder {
  return {
    canEdit,
    productSearchOpen: true,
    setProductSearchOpen: vi.fn(),
    productSearch: '',
    setProductSearch: vi.fn(),
    filteredProducts: [],
    selectedProductForColor: null,
    setSelectedProductForColor: vi.fn(),
    handleProductClick: vi.fn(),
    addProductWithColor: vi.fn(),
    formatCurrency: (value: number) => `R$ ${value}`,
  };
}

describe('QuoteProductSelector durante salvamento', () => {
  it('abre normalmente enquanto a cotação aceita edição', () => {
    renderWithProviders(<QuoteProductSelector canEdit open {...baseProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('não abre quando a cotação já não aceita edição', () => {
    const onAddWithColor = vi.fn();

    renderWithProviders(
      <QuoteProductSelector
        canEdit={false}
        open
        {...baseProps}
        onAddWithColor={onAddWithColor}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onAddWithColor).not.toHaveBeenCalled();
  });

  it('fecha o seletor que já estava aberto no momento em que a edição é bloqueada', () => {
    const { rerender } = renderWithProviders(
      <QuoteProductSelector canEdit open {...baseProps} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // A cotação deixa de aceitar edição com o diálogo aberto (status mudou /
    // versão ficou antiga): reabrir aqui somaria o mesmo item duas vezes.
    rerender(<QuoteProductSelector canEdit={false} open {...baseProps} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a página bloqueia o seletor quando o orçamento deixa de aceitar edição', () => {
    // Se a página parar de repassar `canEdit`, o seletor assume que pode editar
    // e o teste acima continuaria verde.
    const { rerender } = renderWithProviders(<QuoteBuilderDialogs state={estadoDoBuilder(true)} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<QuoteBuilderDialogs state={estadoDoBuilder(false)} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
