import React, { type ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { invokeExternalDb } = vi.hoisted(() => ({ invokeExternalDb: vi.fn() }));

vi.mock('@/lib/external-db/bridge', () => ({ invokeExternalDb }));

import { useKitStockValidation } from '@/hooks/useKitStockValidation';
import type { KitItem } from '@/lib/kit-builder';

const item: KitItem = {
  id: 'produto-1',
  name: 'Camiseta',
  sku: 'CAM-1',
  imageUrl: null,
  price: 20,
  width: 1,
  height: 1,
  depth: 1,
  volume: 1,
  quantity: 2,
  isReplaceable: true,
  allowedVariantIds: ['vermelha', 'azul'],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useKitStockValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida apenas o estoque da variante escolhida, sem somar outras cores', async () => {
    invokeExternalDb.mockResolvedValue({
      records: [
        { id: 'vermelha', product_id: 'produto-1', stock_quantity: 1, color_name: 'Vermelha' },
        { id: 'azul', product_id: 'produto-1', stock_quantity: 200, color_name: 'Azul' },
      ],
    });

    const { result } = renderHook(
      () => useKitStockValidation([{ ...item, selectedVariantId: 'vermelha' }], null, 1),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasStockIssues).toBe(true);
    expect(result.current.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 'produto-1', available: 1, required: 2, reason: 'insufficient_stock' }),
    ]));
  });

  it('exige variante antes de permitir orçamento para item substituível', async () => {
    invokeExternalDb.mockResolvedValue({ records: [] });

    const { result } = renderHook(() => useKitStockValidation([item], null, 1), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: 'variant_required' }),
    ]));
  });
});
