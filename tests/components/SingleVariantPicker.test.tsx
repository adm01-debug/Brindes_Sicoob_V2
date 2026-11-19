/**
 * Catraca: produto SEM nenhuma variação precisa concluir sozinho, chamando
 * `onSelect(null)` — sem isso o fluxo de adicionar ao orçamento trava numa
 * tela vazia esperando uma cor que não existe.
 *
 * Regra viva em `src/components/products/SingleVariantPicker.tsx` (useEffect de
 * auto-skip). Recuperada da PR #112 (fechada sem merge), que também travava um
 * botão "sem cor específica" durante o carregamento — essa metade ficou
 * OBSOLETA: hoje `isLoading` devolve só o skeleton, então não foi recuperada.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SingleVariantPicker } from '@/components/products/SingleVariantPicker';
import {
  useExternalVariantStock,
  type ExternalVariantStock,
} from '@/hooks/useExternalVariantStock';

vi.mock('@/hooks/useExternalVariantStock', () => ({
  useExternalVariantStock: vi.fn(),
}));

const mockedUseExternalVariantStock = vi.mocked(useExternalVariantStock);

function mockStock(data: ExternalVariantStock[] | undefined, isLoading: boolean) {
  mockedUseExternalVariantStock.mockReturnValue({ data, isLoading } as ReturnType<
    typeof useExternalVariantStock
  >);
}

const variante = {
  id: 'var-1',
  product_id: 'produto-1',
  sku: 'SKU-1',
  supplier_sku: null,
  color_code: 'AZ',
  color_name: 'Azul',
  color_hex: '#0000FF',
  size_code: null,
  sale_price: 10,
  stock_quantity: 5,
  next_entry_date: null,
  next_entry_quantity: null,
  selected_thumbnail: null,
  images: null,
  bitrix_product_id: null,
} satisfies ExternalVariantStock;

describe('SingleVariantPicker — auto-encerramento sem variação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conclui sozinho com onSelect(null) quando o produto não possui variantes', async () => {
    mockStock([], false);
    const onSelect = vi.fn();

    render(<SingleVariantPicker productId="produto-sem-variante" onSelect={onSelect} />);

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(null));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('variant-picker-no-variant')).not.toBeInTheDocument();
  });

  it('não conclui sozinho enquanto o estoque externo carrega', async () => {
    mockStock(undefined, true);
    const onSelect = vi.fn();

    render(<SingleVariantPicker productId="produto-1" onSelect={onSelect} />);

    expect(screen.getByText('Carregando variações...')).toBeInTheDocument();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('não conclui sozinho quando o produto possui ao menos uma variante', async () => {
    mockStock([variante], false);
    const onSelect = vi.fn();

    render(<SingleVariantPicker productId="produto-1" onSelect={onSelect} />);

    expect(screen.getByText('Escolha a cor/variação')).toBeInTheDocument();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
