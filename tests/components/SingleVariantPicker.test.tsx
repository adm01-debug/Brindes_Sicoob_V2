import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SingleVariantPicker } from '@/components/products/SingleVariantPicker';
import { useExternalVariantStock } from '@/hooks/useExternalVariantStock';

vi.mock('@/hooks/useExternalVariantStock', () => ({
  useExternalVariantStock: vi.fn(),
}));

const mockedUseExternalVariantStock = vi.mocked(useExternalVariantStock);

describe('SingleVariantPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite continuar sem variante enquanto o estoque externo carrega', () => {
    mockedUseExternalVariantStock.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useExternalVariantStock>);
    const onSelect = vi.fn();

    render(<SingleVariantPicker productId="produto-1" onSelect={onSelect} />);

    expect(screen.getByText('Carregando variações...')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('variant-picker-no-variant'));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
