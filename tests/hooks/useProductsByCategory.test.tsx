import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useProductsByCategory } from '@/hooks/useProductsByCategory';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));

describe('useProductsByCategory', () => {
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
});
