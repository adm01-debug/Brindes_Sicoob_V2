import { describe, expect, it, vi } from 'vitest';
import { resolveQuoteUrlPrefill, type QuotePrefillProduct } from '@/hooks/quote/quote-url-prefill';

const product: QuotePrefillProduct = {
  id: 'produto-1',
  name: 'Caneca institucional',
  sku: 'CAN-001',
  price: 18.5,
  minQuantity: 50,
  images: ['https://catalogo.example/caneca.png'],
  stock: 420,
  priceUpdatedAt: '2026-10-28T12:00:00.000Z',
};

describe('pré-carga de orçamento por URL', () => {
  it('busca IDs de produto, comparação e tendência sem confiar em preço ou quantidade da URL', async () => {
    const fetchProduct = vi.fn(async () => product);
    const result = await resolveQuoteUrlPrefill(
      new URLSearchParams(
        'product_id=produto-1&product_price=0.01&min_quantity=1&produto=produto-1&color_name=Verde',
      ),
      fetchProduct,
    );

    expect(fetchProduct).toHaveBeenCalledTimes(1);
    expect(fetchProduct).toHaveBeenCalledWith('produto-1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      product_id: 'produto-1',
      product_name: 'Caneca institucional',
      product_sku: 'CAN-001',
      product_image_url: 'https://catalogo.example/caneca.png',
      unit_price: 18.5,
      quantity: 50,
      catalog_minimum_quantity: 50,
      catalog_available_stock: 420,
      color_name: 'Verde',
    });
    expect(result.unavailableIds).toEqual([]);
  });

  it('expande comparação em lista, remove IDs repetidos e associa cliente sem aceitar nome fornecido pela URL', async () => {
    const fetchProduct = vi.fn(async (id: string) => ({ ...product, id, name: `Produto ${id}` }));
    const result = await resolveQuoteUrlPrefill(
      new URLSearchParams('products=a,b,a&client_id=cliente-123&client_name=Cliente%20adulterado'),
      fetchProduct,
    );

    expect(fetchProduct.mock.calls.map(([id]) => id)).toEqual(['a', 'b']);
    expect(result.items.map((item) => item.product_id)).toEqual(['a', 'b']);
    expect(result.clientId).toBe('cliente-123');
    expect(result).not.toHaveProperty('clientName');
  });

  it('ignora IDs vazios ou excessivamente longos e limita a carga de produtos', async () => {
    const fetchProduct = vi.fn(async () => product);
    const longId = 'x'.repeat(201);
    const params = new URLSearchParams(`products=,,${longId}`);
    const result = await resolveQuoteUrlPrefill(params, fetchProduct);

    expect(fetchProduct).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.truncatedCount).toBe(0);
    expect(result.invalidCount).toBe(1);
  });

  it('não cria item quando o produto não existe mais no catálogo', async () => {
    const result = await resolveQuoteUrlPrefill(
      new URLSearchParams('products=removido'),
      async () => null,
    );

    expect(result.items).toEqual([]);
    expect(result.unavailableIds).toEqual(['removido']);
  });

  it('rehidrata itens[] antigos usando preço canônico e respeita quantidade mínima', async () => {
    const item = JSON.stringify({
      product_id: 'produto-1',
      product_name: 'Nome adulterado',
      product_price: '0.01',
      quantity: 10,
      color_name: 'Verde',
    });
    const result = await resolveQuoteUrlPrefill(
      new URLSearchParams({ 'items[]': item }),
      async () => product,
    );

    expect(result.items[0]).toMatchObject({
      product_name: 'Caneca institucional',
      unit_price: 18.5,
      quantity: 50,
      color_name: 'Verde',
    });
  });

  it('ignora itens[] malformados', async () => {
    const fetchProduct = vi.fn(async () => product);
    const result = await resolveQuoteUrlPrefill(
      new URLSearchParams({ 'items[]': '{' }),
      fetchProduct,
    );

    expect(fetchProduct).not.toHaveBeenCalled();
    expect(result.invalidCount).toBe(1);
    expect(result.items).toEqual([]);
  });

  it('limita a 20 IDs por link', async () => {
    const ids = Array.from({ length: 22 }, (_, index) => `produto-${index + 1}`);
    const fetchProduct = vi.fn(async (id: string) => ({ ...product, id }));
    const params = new URLSearchParams({ products: ids.join(',') });
    const result = await resolveQuoteUrlPrefill(params, fetchProduct);

    expect(fetchProduct).toHaveBeenCalledTimes(20);
    expect(result.items).toHaveLength(20);
    expect(result.truncatedCount).toBe(2);
  });

  it('usa IDs válidos quando um item[] legado está corrompido e descarta cor hexadecimal inválida', async () => {
    const result = await resolveQuoteUrlPrefill(
      new URLSearchParams({
        'items[]': '{',
        product_id: 'produto-1',
        color_hex: 'url(javascript:alert(1))',
      }),
      async () => product,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.color_hex).toBeUndefined();
    expect(result.invalidCount).toBe(1);
  });
});
