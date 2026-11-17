import { describe, expect, it, vi, beforeEach } from 'vitest';

const resolveSafe = vi.fn();

vi.mock('@/lib/private-storage', () => ({
  resolvePrivateStorageUrlSafe: (value: string | null | undefined, bucket?: string) =>
    resolveSafe(value, bucket),
}));

const { resolveProductRecordImages } = await import('@/lib/external-db/product-record-images');

describe('resolveProductRecordImages', () => {
  beforeEach(() => {
    resolveSafe.mockReset();
    resolveSafe.mockImplementation(async (value: string | null | undefined) =>
      typeof value === 'string' && value.startsWith('supabase-storage://')
        ? value.replace('supabase-storage://', 'https://signed/')
        : (value ?? null),
    );
  });

  it('assina as referencias privadas guardadas no proprio registro do produto', async () => {
    const product = {
      primary_image_url: 'supabase-storage://personalization-images/a.png',
      image_url: 'supabase-storage://personalization-images/b.png',
      og_image_url: null,
      images: [
        'supabase-storage://personalization-images/c.png',
        'https://cdn.exemplo/d.png',
      ],
    } as never as Parameters<typeof resolveProductRecordImages>[0];

    await resolveProductRecordImages(product);

    expect(product.primary_image_url).toBe('https://signed/personalization-images/a.png');
    expect(product.image_url).toBe('https://signed/personalization-images/b.png');
    expect(product.images).toEqual([
      'https://signed/personalization-images/c.png',
      'https://cdn.exemplo/d.png',
    ]);
  });

  it('mantem o valor original quando o storage nao consegue assinar', async () => {
    resolveSafe.mockImplementation(async () => null);
    const product = {
      images: [
        'supabase-storage://personalization-images/indisponivel.png',
        'https://cdn.exemplo/ok.png',
      ],
    } as never as Parameters<typeof resolveProductRecordImages>[0];

    await resolveProductRecordImages(product);

    expect(product.images).toEqual([
      'supabase-storage://personalization-images/indisponivel.png',
      'https://cdn.exemplo/ok.png',
    ]);
  });
});