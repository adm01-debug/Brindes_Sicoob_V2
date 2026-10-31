import { describe, expect, it } from 'vitest';
import {
  buildVerifiedReorderItems,
  personalizationRequestsFromSnapshot,
  ReorderValidationError,
  type CatalogProduct,
  type CatalogVariant,
  type SourceItem,
} from '../../supabase/functions/sicoob-reorder/catalog';

const product: CatalogProduct = {
  id: 'produto-1',
  name: 'Caneca Sicoob',
  sku: 'CAN',
  sale_price: 20,
  primary_image_url: null,
  is_active: true,
  stock_quantity: 100,
  min_quantity: 1,
  min_order_quantity: 1,
  price_last_verified_at: '2026-09-12T19:00:00.000Z',
  price_freshness_threshold_days: 60,
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
    personalization_snapshot: null,
    unit_price: 18,
  };
}

describe('catálogo vigente da recompra Sicoob', () => {
  it('soma linhas da mesma variante antes de validar o estoque', () => {
    expect(() => buildVerifiedReorderItems(
      [source('item-1', 6), source('item-2', 6)],
      [product],
      [variant],
      '2026-09-12T20:00:00.000Z',
    )).toThrow(ReorderValidationError);
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
    expect(result.every((item) => item.historical_unit_price === 18)).toBe(true);
    expect(result.every((item) => item.price_changed)).toBe(true);
    expect(result.every((item) => item.available_stock === 10)).toBe(true);
    expect(result.every((item) => item.stock_is_reserved === false)).toBe(true);
    expect(result.every((item) => item.catalog_valid_until === '2026-09-12T20:05:00.000Z')).toBe(true);
  });

  it('usa o maior mínimo vigente informado pelo catálogo', () => {
    expect(() => buildVerifiedReorderItems(
      [source('item-1', 4)],
      [{ ...product, min_quantity: 2, min_order_quantity: 5 }],
      [variant],
      '2026-09-12T20:00:00.000Z',
    )).toThrow('quantidade mínima vigente');
  });

  it('recusa preço cuja confirmação do fornecedor venceu', () => {
    expect(() => buildVerifiedReorderItems(
      [source('item-1', 4)],
      [{
        ...product,
        price_last_verified_at: '2026-05-01T00:00:00.000Z',
        price_freshness_threshold_days: 30,
      }],
      [variant],
      '2026-09-12T20:00:00.000Z',
    )).toThrow('venceu');
  });

  it('recusa produto marcado como indisponível mesmo com saldo numérico', () => {
    expect(() => buildVerifiedReorderItems(
      [source('item-1', 4)],
      [{ ...product, is_stockout: true }],
      [variant],
      '2026-09-12T20:00:00.000Z',
    )).toThrow('indisponível');
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

describe('personalização histórica da recompra', () => {
  it('normaliza o snapshot para uma nova consulta de técnica e preço', () => {
    expect(personalizationRequestsFromSnapshot({
      technique_id: 'laser', colors_count: 2, width_cm: 4, height_cm: 3,
    })).toEqual([{ techniqueId: 'laser', colors: 2, width: 4, height: 3 }]);
  });

  it('recusa snapshot com técnica ausente em vez de descartar a personalização', () => {
    expect(() => personalizationRequestsFromSnapshot({ colors_count: 1 })).toThrow('técnica');
  });
});
