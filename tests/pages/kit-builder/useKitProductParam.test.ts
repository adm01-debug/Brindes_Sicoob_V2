import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompatibilityResult } from '@/lib/kit-builder';

const { invokeExternalDb, toastSuccess, toastError, toastWarn, transformToKitItem } = vi.hoisted(() => ({
  invokeExternalDb: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarn: vi.fn(),
  transformToKitItem: vi.fn((product: { id: string }) => ({ id: product.id, name: 'Caneta', quantity: 1 })),
}));

vi.mock('@/lib/external-db', () => ({ invokeExternalDb }));
vi.mock('@/hooks/useKitBuilderTransformers', () => ({ transformToKitItem }));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, warning: toastWarn },
}));

import { useKitProductParam } from '@/pages/kit-builder/useKitProductParam';

describe('useKitProductParam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invokeExternalDb.mockResolvedValue({ records: [{ id: 'product-1', name: 'Caneta' }] });
  });

  it('espera a caixa e não reaplica o produto quando addItem muda após a inclusão', async () => {
    const setKitName = vi.fn();
    const addWithoutBox = vi.fn((): CompatibilityResult => ({ fits: false, reason: 'Selecione uma caixa primeiro' }));
    const { rerender } = renderHook(
      ({ addItem }) => useKitProductParam({
        productIdParam: 'product-1', kitIdParam: null, templateIdParam: null, addItem, setKitName,
      }),
      { initialProps: { addItem: addWithoutBox } },
    );

    await waitFor(() => expect(addWithoutBox).toHaveBeenCalledOnce());

    const addWithBox = vi.fn((): CompatibilityResult => ({ fits: true }));
    rerender({ addItem: addWithBox });
    await waitFor(() => expect(addWithBox).toHaveBeenCalledOnce());

    const addAfterItemsChanged = vi.fn((): CompatibilityResult => ({ fits: true }));
    rerender({ addItem: addAfterItemsChanged });
    await act(async () => Promise.resolve());

    expect(addAfterItemsChanged).not.toHaveBeenCalled();
    expect(invokeExternalDb).toHaveBeenCalledTimes(2);
    expect(setKitName).toHaveBeenCalledWith('Caneta');
    expect(toastSuccess).toHaveBeenCalledOnce();
  });

  it('permite aplicar um produto diferente ao mudar o parâmetro da URL', async () => {
    const setKitName = vi.fn();
    const addItem = vi.fn((): CompatibilityResult => ({ fits: true }));
    const { rerender } = renderHook(
      ({ productId }) => useKitProductParam({
        productIdParam: productId, kitIdParam: null, templateIdParam: null, addItem, setKitName,
      }),
      { initialProps: { productId: 'product-1' } },
    );

    await waitFor(() => expect(addItem).toHaveBeenCalledOnce());
    invokeExternalDb.mockResolvedValueOnce({ records: [{ id: 'product-2', name: 'Caderno' }] });

    rerender({ productId: 'product-2' });

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(2));
    expect(transformToKitItem).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'product-2' }));
  });
});
