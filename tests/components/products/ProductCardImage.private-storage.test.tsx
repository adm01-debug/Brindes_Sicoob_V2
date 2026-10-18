import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resolvePrivateStorageUrl: vi.fn() }));

vi.mock('@/lib/private-storage', () => ({
  isPrivateStorageUrl: (value: string, bucket: string) => value.startsWith(`supabase-storage://${bucket}/`) ||
    value.startsWith('https://cfmzkthhgliqelozlmwu.supabase.co/storage/v1/object/') && value.includes(`/${bucket}/`),
  resolvePrivateStorageUrl: mocks.resolvePrivateStorageUrl,
}));

import { ProductCardImage } from '@/components/products/ProductCardImage';

const privateReference = 'supabase-storage://personalization-images/produtos/caneca.png';

function imageProps(url: string) {
  return {
    product: { name: 'Caneca', images: [url], colors: [] },
    cardImageUrl: url,
    activeColorName: null,
    colorSpecificImage: null,
    imageLoaded: false,
    isHovered: false,
    computedImageScale: 1,
    isNovelty: false,
    allMatchingVariants: [],
    hasMultipleVariants: false,
    safeVariantIdx: 0,
    onImageLoad: vi.fn(),
    onVariantChange: vi.fn(),
  };
}

describe('imagem privada do catálogo', () => {
  beforeEach(() => { mocks.resolvePrivateStorageUrl.mockReset(); });

  it('assina a referência durável e não gera srcSet sem autorização', async () => {
    mocks.resolvePrivateStorageUrl.mockResolvedValue('https://storage.test/object/sign/caneca.png?token=abc');
    render(<ProductCardImage {...imageProps(privateReference)} />);

    await screen.findByRole('img', { name: 'Caneca' });
    await waitFor(() => expect(screen.getByRole('img', { name: 'Caneca' })).toHaveAttribute('src', 'https://storage.test/object/sign/caneca.png?token=abc'));
    const image = screen.getByRole('img', { name: 'Caneca' });
    expect(image).not.toHaveAttribute('srcset');
    expect(mocks.resolvePrivateStorageUrl).toHaveBeenCalledWith(privateReference, 'personalization-images');
  });

  it('mantém uma imagem pública sem pedir assinatura', async () => {
    const publicUrl = 'https://cdn.example.test/caneca.webp';
    render(<ProductCardImage {...imageProps(publicUrl)} />);

    const image = await screen.findByRole('img', { name: 'Caneca' });
    expect(image).toHaveAttribute('src', publicUrl);
    expect(image).not.toHaveAttribute('srcset');
    expect(mocks.resolvePrivateStorageUrl).not.toHaveBeenCalled();
  });

  it('não trata rota de storage de outro domínio como imagem privada', async () => {
    const hostileUrl = 'https://cdn.exemplo.test/storage/v1/object/sign/personalization-images/produto.png?token=externo';
    render(<ProductCardImage {...imageProps(hostileUrl)} />);

    expect(await screen.findByRole('img', { name: 'Caneca' })).toHaveAttribute('src', hostileUrl);
    expect(mocks.resolvePrivateStorageUrl).not.toHaveBeenCalled();
  });

  it('não faz prefetch de variantes privadas como se fossem URLs navegáveis', async () => {
    const assigned: string[] = [];
    class PrefetchImage {
      set src(value: string) { assigned.push(value); }
    }
    vi.stubGlobal('Image', PrefetchImage);
    try {
      render(<ProductCardImage {...imageProps('https://cdn.example.test/ativa.webp')} isHovered hasMultipleVariants
        allMatchingVariants={[
          { name: 'Ativa', hex: '#111111', image: 'https://cdn.example.test/ativa.webp' },
          { name: 'Privada', hex: '#222222', image: privateReference },
          { name: 'Pública', hex: '#333333', image: 'https://cdn.example.test/publica.webp' },
        ]} />);

      expect(assigned).toEqual(['https://cdn.example.test/publica.webp']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('recupera o carregamento quando o mesmo card recebe outra URL', async () => {
    const { rerender } = render(<ProductCardImage {...imageProps('https://cdn.example.test/primeiro.webp')} />);
    const image = await screen.findByRole('img', { name: 'Caneca' });
    fireEvent.error(image);
    await waitFor(() => expect(image).toHaveAttribute('src', '/placeholder.svg'));

    rerender(<ProductCardImage {...imageProps('https://cdn.example.test/segundo.webp')} />);
    const nextImage = await screen.findByRole('img', { name: 'Caneca' });
    expect(nextImage).not.toBe(image);
    fireEvent.error(image);
    await waitFor(() => expect(nextImage).toHaveAttribute('src', 'https://cdn.example.test/segundo.webp'));
  });

  it('usa placeholder se a assinatura falhar e não vaza a referência privada no src', async () => {
    let rejectSigning!: (reason: Error) => void;
    mocks.resolvePrivateStorageUrl.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectSigning = reject;
    }));
    render(<ProductCardImage {...imageProps(privateReference)} />);

    const image = await screen.findByRole('img', { name: 'Caneca' });
    await waitFor(() => expect(rejectSigning).toBeTypeOf('function'));
    await act(async () => { rejectSigning(new Error('sem permissão')); });
    await waitFor(() => expect(image).toHaveAttribute('src', '/placeholder.svg'));
    expect(image.getAttribute('src')).not.toContain('supabase-storage:');
  });

  it('ignora uma assinatura atrasada quando o card troca de produto', async () => {
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    mocks.resolvePrivateStorageUrl.mockImplementation((value: string = '') => new Promise<string>((resolve) => {
      if (value.includes('primeiro')) resolveFirst = resolve;
      else resolveSecond = resolve;
    }));
    const { rerender } = render(<ProductCardImage {...imageProps('supabase-storage://personalization-images/primeiro.png')} />);
    rerender(<ProductCardImage {...imageProps('supabase-storage://personalization-images/segundo.png')} />);

    await waitFor(() => expect(resolveSecond).toBeTypeOf('function'));
    await act(async () => { resolveSecond('https://storage.test/segundo?token=2'); });
    const image = await screen.findByRole('img', { name: 'Caneca' });
    await waitFor(() => expect(image).toHaveAttribute('src', 'https://storage.test/segundo?token=2'));
    await act(async () => { resolveFirst('https://storage.test/primeiro?token=1'); });
    await waitFor(() => expect(image).toHaveAttribute('src', 'https://storage.test/segundo?token=2'));
  });
});
