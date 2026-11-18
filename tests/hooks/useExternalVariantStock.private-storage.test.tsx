import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const invokeExternalDb = vi.fn();
const resolveSafe = vi.fn();

vi.mock('@/lib/external-db', () => ({
  invokeExternalDb: (args: unknown) => invokeExternalDb(args),
}));

vi.mock('@/lib/private-storage', () => ({
  resolvePrivateStorageUrlSafe: (value: string | null | undefined, bucket?: string) =>
    resolveSafe(value, bucket),
}));

const { useExternalVariantStock } = await import('@/hooks/useExternalVariantStock');

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useExternalVariantStock', () => {
  beforeEach(() => {
    invokeExternalDb.mockReset();
    resolveSafe.mockReset();
    resolveSafe.mockImplementation(async (value: string | null | undefined) =>
      typeof value === 'string' && value.startsWith('supabase-storage://')
        ? value.replace('supabase-storage://', 'https://signed/')
        : (value ?? null),
    );
    invokeExternalDb.mockImplementation(async (args: { table: string }) =>
      args.table === 'product_variants'
        ? { records: [{ id: 'v1', color_code: 'AZ', selected_thumbnail: null, images: null }] }
        : {
            records: [
              {
                id: 'i1',
                variant_id: 'v1',
                supplier_code: 'AZ',
                url_cdn: 'supabase-storage://personalization-images/v1.png',
                is_og_image: true,
                is_primary: false,
                image_type: 'photo',
              },
            ],
          },
    );
  });

  it('assina a miniatura da variante antes de expor ao consumidor', async () => {
    const { result } = renderHook(() => useExternalVariantStock('p1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].selected_thumbnail).toBe(
      'https://signed/personalization-images/v1.png',
    );
    expect(resolveSafe).toHaveBeenCalledWith(
      'supabase-storage://personalization-images/v1.png',
      'personalization-images',
    );
  });

  it('mantem o valor original quando o storage nao consegue assinar', async () => {
    resolveSafe.mockImplementation(async () => null);

    const { result } = renderHook(() => useExternalVariantStock('p1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].selected_thumbnail).toBe(
      'supabase-storage://personalization-images/v1.png',
    );
  });
});