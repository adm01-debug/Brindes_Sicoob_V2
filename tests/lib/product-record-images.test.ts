import { describe, expect, it, vi, beforeEach } from 'vitest';

const resolveSafe = vi.fn();

vi.mock('@/lib/private-storage', () => ({
  resolvePrivateStorageUrlSafe: (value: string | null | undefined, bucket?: string) =>
    resolveSafe(value, bucket),
  isPrivateStorageUrl: (value: string, bucket: string) =>
    value.startsWith(`supabase-storage://${bucket}/`) ||
    value.includes(`/storage/v1/object/public/${bucket}/`) ||
    value.includes(`/storage/v1/object/sign/${bucket}/`),
}));

const { resolveProductRecordImages, resolveProductImageRecords } = await import('@/lib/external-db/product-record-images');

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
describe('resolveProductImageRecords', () => {
  beforeEach(() => {
    resolveSafe.mockReset();
    resolveSafe.mockImplementation(async (value: string | null | undefined) =>
      typeof value === 'string' && value.startsWith('supabase-storage://')
        ? value.replace('supabase-storage://', 'https://signed/')
        : (value ?? null),
    );
  });

  it('assina em lote apenas os registros com referencia privada', async () => {
    const records = [
      { primary_image_url: 'supabase-storage://personalization-images/a.png' },
      { primary_image_url: 'https://cdn.exemplo/b.png' },
    ];

    const resolved = await resolveProductImageRecords(records);

    expect(resolved[0].primary_image_url).toBe('https://signed/personalization-images/a.png');
    expect(resolved[1].primary_image_url).toBe('https://cdn.exemplo/b.png');
    expect(resolveSafe).toHaveBeenCalledTimes(3);
  });

  it('nao faz nenhuma chamada ao storage quando nao ha referencia privada', async () => {
    const resolved = await resolveProductImageRecords([
      { primary_image_url: 'https://cdn.exemplo/a.png', images: ['https://cdn.exemplo/b.png'] },
    ]);

    expect(resolveSafe).not.toHaveBeenCalled();
    expect(resolved).toHaveLength(1);
  });

  it('assina em lote os registros com URL legada do bucket privado', async () => {
    resolveSafe.mockImplementation(async (value: string | null | undefined) =>
      typeof value === 'string' && value.includes('/storage/v1/object/public/')
        ? 'https://signed/legado.png'
        : (value ?? null),
    );

    const resolved = await resolveProductImageRecords([
      { primary_image_url: 'https://proj.supabase.co/storage/v1/object/public/personalization-images/legado.png' },
    ]);

    expect(resolveSafe).toHaveBeenCalled();
    expect(resolved[0].primary_image_url).toBe('https://signed/legado.png');
  });

  it('tolera lista nula', async () => {
    await expect(resolveProductImageRecords(null)).resolves.toEqual([]);
  });
});
