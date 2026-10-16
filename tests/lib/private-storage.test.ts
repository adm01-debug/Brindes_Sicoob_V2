import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: mocks.from } },
}));

import {
  createPrivateStorageUrl,
  createPrivateStorageReference,
  canonicalPrivateStorageValue,
  parsePrivateStorageReference,
  PRIVATE_STORAGE_URL_TTL_SECONDS,
  privateStoragePathFromUrl,
  resolvePrivateStorageUrl,
} from '@/lib/private-storage';

describe('createPrivateStorageUrl', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.createSignedUrl.mockReset();
    mocks.from.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });
  });

  it('assina o caminho no bucket privado pelo TTL padrão', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.test/object/sign/arquivo?token=seguro' },
      error: null,
    });

    await expect(createPrivateStorageUrl('mockup-art-files', 'usuario/logo.png'))
      .resolves.toContain('/object/sign/');
    expect(mocks.from).toHaveBeenCalledWith('mockup-art-files');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      'usuario/logo.png',
      PRIVATE_STORAGE_URL_TTL_SECONDS,
    );
  });

  it('propaga a falha de autorização sem fabricar URL pública', async () => {
    const error = new Error('sem permissão');
    mocks.createSignedUrl.mockResolvedValue({ data: null, error });

    await expect(createPrivateStorageUrl('supplier-logos', 'suppliers/1.png'))
      .rejects.toBe(error);
  });

  it('rejeita resposta sem URL assinada', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: {}, error: null });

    await expect(createPrivateStorageUrl('product-videos', 'videos/1.mp4'))
      .rejects.toThrow('Storage não retornou URL assinada');
  });
});

describe('privateStoragePathFromUrl', () => {
  it('recupera o caminho sem incorporar o token da URL assinada', () => {
    const url = 'https://storage.test/storage/v1/object/sign/personalization-images/produtos/pasta%20segura/foto.png?token=secreto';
    expect(privateStoragePathFromUrl('personalization-images', url))
      .toBe('produtos/pasta segura/foto.png');
  });

  it('recusa URL de outro bucket', () => {
    expect(privateStoragePathFromUrl(
      'supplier-logos',
      'https://storage.test/storage/v1/object/sign/product-videos/videos/1.mp4?token=x',
    )).toBeNull();
  });
});

describe('referência durável e renovação', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.createSignedUrl.mockReset();
    mocks.from.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });
  });

  it('serializa bucket e caminho sem persistir bearer token', () => {
    const reference = createPrivateStorageReference(
      'personalization-images',
      'produtos/pasta segura/foto 1.png',
    );

    expect(reference).toBe('supabase-storage://personalization-images/produtos/pasta%20segura/foto%201.png');
    expect(parsePrivateStorageReference(reference)).toEqual({
      bucket: 'personalization-images',
      path: 'produtos/pasta segura/foto 1.png',
    });
  });

  it('renova a assinatura depois que o cache expira', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
    mocks.createSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: 'https://storage.test/assinatura-1' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://storage.test/assinatura-2' }, error: null });
    const reference = createPrivateStorageReference('product-videos', 'videos/produto-99.mp4');

    await expect(resolvePrivateStorageUrl(reference, 'product-videos'))
      .resolves.toBe('https://storage.test/assinatura-1');
    vi.advanceTimersByTime(PRIVATE_STORAGE_URL_TTL_SECONDS * 1_000);
    await expect(resolvePrivateStorageUrl(reference, 'product-videos'))
      .resolves.toBe('https://storage.test/assinatura-2');
    expect(mocks.createSignedUrl).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('renova URL assinada legada e preserva URL externa', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.test/renovada' },
      error: null,
    });
    const legacy = 'https://storage.test/storage/v1/object/sign/supplier-logos/suppliers/1.png?token=expirado';

    await expect(resolvePrivateStorageUrl(legacy, 'supplier-logos'))
      .resolves.toBe('https://storage.test/renovada');
    await expect(resolvePrivateStorageUrl('https://cdn.externo.test/logo.png', 'supplier-logos'))
      .resolves.toBe('https://cdn.externo.test/logo.png');
    expect(mocks.createSignedUrl).toHaveBeenCalledOnce();
  });

  it('não interpreta caminho semelhante em domínio externo como objeto interno', async () => {
    const external = 'https://cdn.externo.test/catalogo/supplier-logos/suppliers/1.png';

    await expect(resolvePrivateStorageUrl(external, 'supplier-logos')).resolves.toBe(external);
    expect(canonicalPrivateStorageValue(external, 'supplier-logos')).toBe(external);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('converte assinatura legada para referência estável antes de persistir', () => {
    const legacy = 'https://storage.test/storage/v1/object/sign/mockup-art-files/user/layout.jpg?token=temporario';

    expect(canonicalPrivateStorageValue(legacy, 'mockup-art-files'))
      .toBe('supabase-storage://mockup-art-files/user/layout.jpg');
    expect(canonicalPrivateStorageValue('https://cdn.externo.test/layout.jpg', 'mockup-art-files'))
      .toBe('https://cdn.externo.test/layout.jpg');
  });
});
