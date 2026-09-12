/** Auditoria histórica: expectativas de falha só executam pela configuração explícita. */
import React, { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { KitItem, KitState } from '@/lib/kit-builder';

const { invokeExternalDb, updateResult } = vi.hoisted(() => ({
  invokeExternalDb: vi.fn(), updateResult: vi.fn(),
}));
vi.mock('@/lib/external-db/bridge', () => ({ invokeExternalDb }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: () => ({ eq: () => ({ eq: updateResult }) }) }) },
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

describe('Lacunas reproduzidas em módulos reais, com dependências simuladas', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
  afterEach(() => { vi.useRealTimers(); });

  it('S07: duas linhas de seis unidades aceitam o mesmo estoque de dez', async () => {
    invokeExternalDb.mockResolvedValue({ records: [
      { id: 'verde', product_id: item.id, stock_quantity: 10, color_name: 'Verde' },
    ] });
    const { result } = renderHook(() => useKitStockValidation([item, { ...item }], null, 1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.hasStockIssues).toBe(false);
    // A entrada sintética pede 12; o hook compara cada linha isoladamente.
    expect(item.quantity * 2).toBeGreaterThan(10);
  });

  it('S08: update com zero linhas afetadas ainda anuncia kit salvo', async () => {
    vi.useFakeTimers();
    updateResult.mockResolvedValue({ error: null, data: [], count: 0 });
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
    expect(updateResult).toHaveBeenCalledOnce();
    expect(result.current.lastSaveError).toBeNull();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('S09: remover a chave no logout não limpa o store de vistos em memória', () => {
    vi.useFakeTimers();
    useRecentlyViewedStore.getState().clearRecentlyViewed();
    useRecentlyViewedStore.getState().addToRecentlyViewed('produto-da-cooperativa-anterior');
    localStorage.removeItem('recently-viewed-products');
    expect(localStorage.getItem('recently-viewed-products')).toBeNull();
    expect(useRecentlyViewedStore.getState().items[0].productId).toBe('produto-da-cooperativa-anterior');
    useRecentlyViewedStore.getState().clearRecentlyViewed();
    vi.runOnlyPendingTimers();
  });
});
