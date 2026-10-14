import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const { invokeBatchBridge } = vi.hoisted(() => ({ invokeBatchBridge: vi.fn() }));

vi.mock('@/lib/external-db', () => ({ invokeBatchBridge }));

import { fetchMatchingProductIds, useProductsByColor } from '@/hooks/useProductsByColor';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function referenceResult(slug: string, groupId: string, colorId: string) {
  return [
    { success: true, data: { records: [{ id: groupId, name: slug, slug }] } },
    { success: true, data: { records: [{ id: colorId, name: slug, slug, group_id: groupId }] } },
    { success: true, data: { records: [] } },
  ];
}

describe('consulta relacional de cores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pagina além dos 500 primeiros vínculos sem duplicar produtos', async () => {
    invokeBatchBridge
      .mockResolvedValueOnce([{
        success: true,
        data: { records: Array.from({ length: 500 }, (_, index) => ({ product_id: `produto-${index}` })) },
      }])
      .mockResolvedValueOnce([{
        success: true,
        data: { records: [{ product_id: 'produto-499' }, { product_id: 'produto-500' }] },
      }]);

    const result = await fetchMatchingProductIds(['cor-1']);

    expect(result.size).toBe(501);
    expect(invokeBatchBridge).toHaveBeenNthCalledWith(1, [expect.objectContaining({ offset: 0, limit: 500 })]);
    expect(invokeBatchBridge).toHaveBeenNthCalledWith(2, [expect.objectContaining({ offset: 500, limit: 500 })]);
  });

  it('continua a paginação pelo limite efetivo quando o bridge degrada o lote', async () => {
    invokeBatchBridge
      .mockResolvedValueOnce([{
        success: true,
        data: {
          records: Array.from({ length: 50 }, (_, index) => ({ product_id: `produto-${index}` })),
          meta: { effective_limit: 50 },
        },
      }])
      .mockResolvedValueOnce([{
        success: true,
        data: { records: [{ product_id: 'produto-50' }], meta: { effective_limit: 50 } },
      }]);

    const result = await fetchMatchingProductIds(['cor-1']);

    expect(result.size).toBe(51);
    expect(invokeBatchBridge).toHaveBeenNthCalledWith(2, [expect.objectContaining({ offset: 50, limit: 500 })]);
  });

  it('descarta a resposta antiga quando o usuário troca a cor durante a consulta', async () => {
    const first = deferred<ReturnType<typeof referenceResult>>();
    const second = deferred<ReturnType<typeof referenceResult>>();
    invokeBatchBridge
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockResolvedValueOnce([{ success: true, data: { records: [{ product_id: 'produto-b' }] } }])
      .mockResolvedValueOnce([{ success: true, data: { records: [{ product_id: 'produto-a' }] } }]);

    const { result, rerender } = renderHook(
      ({ group }) => useProductsByColor({ colorGroups: [group], colorVariations: [], colorNuances: [], colors: [] }),
      { initialProps: { group: 'grupo-a' } },
    );
    rerender({ group: 'grupo-b' });

    await act(async () => second.resolve(referenceResult('grupo-b', 'grupo-b-id', 'cor-b')));
    await waitFor(() => expect([...result.current.productIds]).toEqual(['produto-b']));

    await act(async () => first.resolve(referenceResult('grupo-a', 'grupo-a-id', 'cor-a')));
    await waitFor(() => expect([...result.current.productIds]).toEqual(['produto-b']));
  });

  it('resolve nuances pela relação nuance_id das variações', async () => {
    invokeBatchBridge
      .mockResolvedValueOnce([
        { success: true, data: { records: [] } },
        { success: true, data: { records: [{ id: 'cor-clara', nuance_id: 'nuance-clara' }] } },
        { success: true, data: { records: [{ id: 'nuance-clara', slug: 'clara' }] } },
      ])
      .mockResolvedValueOnce([{
        success: true,
        data: { records: [{ product_id: 'produto-claro' }] },
      }]);

    const { result } = renderHook(() => useProductsByColor({
      colorGroups: [], colorVariations: [], colorNuances: ['clara'], colors: [],
    }));

    await waitFor(() => expect([...result.current.productIds]).toEqual(['produto-claro']));
    expect(invokeBatchBridge).toHaveBeenLastCalledWith([
      expect.objectContaining({ filters: { is_active: true, color_id: ['cor-clara'] } }),
    ]);
  });

  it('expõe falha parcial do lote sem interpretar erro como catálogo vazio', async () => {
    invokeBatchBridge.mockResolvedValueOnce([
      { success: true, data: { records: [] } },
      { success: false, error: 'Falha na consulta de variações' },
      { success: true, data: { records: [] } },
    ]);

    const { result } = renderHook(() => useProductsByColor({
      colorGroups: ['azul'], colorVariations: [], colorNuances: [], colors: [],
    }));

    await waitFor(() => expect(result.current.error?.message).toBe('Falha na consulta de variações'));
    expect(result.current.hasFilter).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.productIds.size).toBe(0);
  });
});
