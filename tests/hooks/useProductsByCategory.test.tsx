import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductsByCategory } from '@/hooks/useProductsByCategory';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));

describe('useProductsByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mantém o estado vazio estável quando não há filtro', () => {
    const { result, rerender } = renderHook(
      ({ categoryIds }: { categoryIds: string[] }) => useProductsByCategory({ categoryIds }),
      { initialProps: { categoryIds: [] } },
    );
    const initialSet = result.current.productIds;

    rerender({ categoryIds: [] });
    rerender({ categoryIds: [] });

    expect(result.current.productIds).toBe(initialSet);
    expect(result.current.isLoading).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('mantém somente a resposta da categoria mais recente em trocas concorrentes', async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    invoke
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }));

    const { result, rerender } = renderHook(
      ({ categoryIds }: { categoryIds: string[] }) => useProductsByCategory({ categoryIds }),
      { initialProps: { categoryIds: ['categoria-b'] } },
    );
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    rerender({ categoryIds: ['categoria-c'] });
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecond({ data: { success: true, productIds: ['produto-c'], categoriesUsed: 1 }, error: null });
    });
    await waitFor(() => expect([...result.current.productIds]).toEqual(['produto-c']));

    await act(async () => {
      resolveFirst({ data: { success: true, productIds: ['produto-b'], categoriesUsed: 1 }, error: null });
    });

    expect([...result.current.productIds]).toEqual(['produto-c']);
    expect(result.current.isLoading).toBe(false);
  });

  it('refaz a consulta quando muda a inclusão de descendentes', async () => {
    invoke.mockResolvedValue({ data: { success: true, productIds: [] }, error: null });
    const { rerender } = renderHook(
      ({ includeDescendants }: { includeDescendants: boolean }) => useProductsByCategory({
        categoryIds: ['categoria-a'],
        includeDescendants,
      }),
      { initialProps: { includeDescendants: true } },
    );
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

    rerender({ includeDescendants: false });

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke).toHaveBeenLastCalledWith('categories-api', {
      body: {
        action: 'products_by_categories',
        categoryIds: ['categoria-a'],
        includeDescendants: false,
      },
    });
  });
});
