import { describe, expect, it } from 'vitest';
import { buildVerifiedReorderItems, type CatalogProduct, type CatalogVariant, type SourceItem } from '../../supabase/functions/sicoob-reorder/catalog';

const product: CatalogProduct = {
  id: 'produto-1',
  name: 'Caneca Sicoob',
  sku: 'CAN',
  sale_price: 20,
  primary_image_url: null,
  is_active: true,
  stock_quantity: 100,
  min_quantity: 1,
};

const variant: CatalogVariant = {
  id: 'variante-1',
  product_id: product.id,
  sku: 'CAN-VD',
  sale_price: 24.5,
  color_name: 'Verde',
  color_hex: '#00A091',
  size_code: null,
  stock_quantity: 10,
  selected_thumbnail: null,
  is_active: true,
};

function source(id: string, quantity: number): SourceItem {
  return {
    id,
    product_id: product.id,
    product_name: product.name,
    quantity,
    variant_id: variant.id,
    color_name: null,
    color_hex: null,
    size_code: null,
  };
}

describe('catálogo vigente da recompra Sicoob', () => {
  it('soma linhas da mesma variante antes de validar o estoque', () => {
    expect(() => buildVerifiedReorderItems(
      [source('item-1', 6), source('item-2', 6)],
      [product],
      [variant],
      '2026-09-12T20:00:00.000Z',
    )).toThrow('Estoque insuficiente');
  });

  it('usa o preço vigente da variante e preserva cada item de origem', () => {
    const result = buildVerifiedReorderItems(
      [source('item-1', 4), source('item-2', 5)],
      [product],
      [variant],
      '2026-09-12T20:00:00.000Z',
    );

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.source_order_item_id)).toEqual(['item-1', 'item-2']);
    expect(result.every((item) => item.unit_price === 24.5)).toBe(true);
  });

  it('avalia a quantidade mínima sobre a demanda total do SKU', () => {
    const result = buildVerifiedReorderItems(
      [source('item-1', 2), source('item-2', 3)],
      [{ ...product, min_quantity: 5 }],
      [variant],
      '2026-09-12T20:00:00.000Z',
    );
    expect(result).toHaveLength(2);
  });
});
