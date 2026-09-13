/** Regressões dirigidas para as lacunas S07–S09 encontradas na auditoria. */
import React, { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { KitItem, KitState } from '@/lib/kit-builder';

const { invokeExternalDb, maybeSingle } = vi.hoisted(() => ({
  invokeExternalDb: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock('@/lib/external-db/bridge', () => ({ invokeExternalDb }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: () => ({
        eq: () => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }),
      }),
    }),
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'usuario-sintetico' } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

import { useKitStockValidation } from '@/hooks/useKitStockValidation';
import { useKitAutoSave } from '@/hooks/useKitAutoSave';
import { useRecentlyViewedStore } from '@/stores/useRecentlyViewedStore';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const item: KitItem = {
  id: 'produto-sintetico', name: 'Caneca sintética', sku: 'C-1', imageUrl: null,
  price: 10, width: 1, height: 1, depth: 1, volume: 1, quantity: 6,
  selectedVariantId: 'verde', isReplaceable: true, allowedVariantIds: ['verde'],
};

describe('Regressões das lacunas S07–S09, com dependências simuladas', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
  afterEach(() => { vi.useRealTimers(); });

  it('S07: agrega duas linhas antes de comparar com o estoque da variante', async () => {
    invokeExternalDb.mockResolvedValue({ records: [
      { id: 'verde', product_id: item.id, stock_quantity: 10, color_name: 'Verde' },
    ] });
    const { result } = renderHook(() => useKitStockValidation([item, { ...item }], null, 1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.hasStockIssues).toBe(true);
    expect(result.current.alerts).toEqual([
      expect.objectContaining({ itemId: item.id, required: 12, available: 10, deficit: 2 }),
    ]);
  });

  it('S08: update com zero linhas afetadas é tratado como falha', async () => {
    vi.useFakeTimers();
    maybeSingle.mockResolvedValue({ error: null, data: null });
    const inicial = {
      name: 'Kit sintético', kitType: 'montado', box: null, items: [item],
      personalization: { box: { enabled: false }, items: {} },
    } as KitState;
    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-inexistente'),
      { initialProps: { kit: inicial } },
    );
    rerender({ kit: { ...inicial, name: 'Alteração sem persistência' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(maybeSingle).toHaveBeenCalledOnce();
    expect(result.current.lastSaveError).toContain('não foi encontrado');
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('S09: reset de logout limpa o escopo, memória e armazenamento', () => {
    vi.useFakeTimers();
    useRecentlyViewedStore.getState().setScope('user:u1:org:a');
    useRecentlyViewedStore.getState().addToRecentlyViewed('produto-da-cooperativa-anterior');
    const key = 'recently-viewed-products:user%3Au1%3Aorg%3Aa';
    expect(localStorage.getItem(key)).not.toBeNull();
    useRecentlyViewedStore.getState().reset();
    expect(localStorage.getItem(key)).toBeNull();
    expect(useRecentlyViewedStore.getState()).toMatchObject({ items: [], itemCount: 0, scopeKey: null });
    vi.runOnlyPendingTimers();
  });
});
