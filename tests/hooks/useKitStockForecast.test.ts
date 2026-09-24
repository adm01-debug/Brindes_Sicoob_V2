import { describe, expect, it } from 'vitest';
import { calculateKitStockForecast } from '@/hooks/useKitStockForecast';
import type { KitItem } from '@/lib/kit-builder';

function item(overrides: Partial<KitItem> = {}): KitItem {
  return {
    id: 'product-1', name: 'Garrafa', sku: 'GAR-1', imageUrl: null, price: 10,
    width: 1, height: 1, depth: 1, volume: 1, quantity: 1,
    ...overrides,
  };
}

describe('calculateKitStockForecast', () => {
  it('confirma fechamento imediato somente quando o saldo canônico cobre toda a demanda', () => {
    const forecast = calculateKitStockForecast([item({ quantity: 2 })], 3, {
      products: [{ id: 'product-1', stock_quantity: 6 }], variants: [], sources: [],
    });

    expect(forecast).toMatchObject({ ready: true, idealClosingDate: null, hasCompleteReplenishmentForecast: true });
    expect(forecast.itemsAtRisk).toEqual([]);
  });

  it('agrega linhas repetidas e só libera uma data após a reposição cobrir o déficit inteiro', () => {
    const forecast = calculateKitStockForecast([item({ quantity: 2 }), item({ quantity: 1 })], 2, {
      products: [], variants: [{ id: 'variant-1', product_id: 'product-1', stock_quantity: 5 }],
      sources: [{
        variant_id: 'variant-1', next_date_1: '2099-01-10', next_quantity_1: 1,
        next_date_2: null, next_quantity_2: null, next_date_3: null, next_quantity_3: null,
      }],
    });

    expect(forecast).toMatchObject({ ready: false, idealClosingDate: '2099-01-13', hasCompleteReplenishmentForecast: true });
    expect(forecast.itemsAtRisk).toEqual([expect.objectContaining({ deficit: 1, nextEntryQty: 1, coveredByForecast: true })]);
  });

  it('não inventa data de fechamento quando as entradas futuras não cobrem a quantidade necessária', () => {
    const forecast = calculateKitStockForecast([item({ quantity: 10 })], 1, {
      products: [], variants: [{ id: 'variant-1', product_id: 'product-1', stock_quantity: 2 }],
      sources: [{
        variant_id: 'variant-1', next_date_1: '2099-02-10', next_quantity_1: 4,
        next_date_2: null, next_quantity_2: null, next_date_3: null, next_quantity_3: null,
      }],
    });

    expect(forecast).toMatchObject({ ready: false, idealClosingDate: null, hasCompleteReplenishmentForecast: false });
    expect(forecast.itemsAtRisk).toEqual([expect.objectContaining({ deficit: 8, coveredByForecast: false })]);
  });

  it('respeita a variante escolhida e não usa estoque de outro SKU como cobertura', () => {
    const forecast = calculateKitStockForecast([item({ quantity: 2, selectedVariantId: 'variant-red' })], 1, {
      products: [{ id: 'product-1', stock_quantity: 10 }],
      variants: [
        { id: 'variant-red', product_id: 'product-1', stock_quantity: 1 },
        { id: 'variant-blue', product_id: 'product-1', stock_quantity: 9 },
      ],
      sources: [],
    });

    expect(forecast.itemsAtRisk).toEqual([expect.objectContaining({ deficit: 1, coveredByForecast: false })]);
  });
});
