import { describe, expect, it } from 'vitest';
import { buildAtomicQuoteItems } from '@/hooks/quotes/quoteHelpers';

describe('documento transacional do orçamento', () => {
  it('preserva identidade da variante e dimensões da personalização', () => {
    expect(buildAtomicQuoteItems([{
      product_id: 'produto-1',
      product_name: 'Caneca Sicoob',
      quantity: 10,
      unit_price: 12.5,
      source_variant_id: 'variante-azul',
      source_variant_sku: 'CAN-AZ',
      personalizations: [{
        technique_id: 'silk',
        width_cm: 8,
        height_cm: 4,
        personalized_quantity: 10,
        setup_cost: 25,
        unit_cost: 1.5,
        total_cost: 40,
      }],
    }])).toEqual([expect.objectContaining({
      source_variant_id: 'variante-azul',
      source_variant_sku: 'CAN-AZ',
      personalizations: [expect.objectContaining({
        width_cm: 8,
        height_cm: 4,
        personalized_quantity: 10,
      })],
    })]);
  });

  it('não envia IDs e totais derivados controlados pelo navegador', () => {
    const [item] = buildAtomicQuoteItems([{
      id: 'id-local-descartado',
      quote_id: 'orcamento-local-descartado',
      product_id: 'produto-1',
      product_name: 'Mochila',
      quantity: 2,
      unit_price: 50,
      subtotal: 1,
      total_price: 1,
      personalizations: [],
    }]);

    expect(item).not.toHaveProperty('id');
    expect(item).not.toHaveProperty('quote_id');
    expect(item).not.toHaveProperty('subtotal');
    expect(item).not.toHaveProperty('total_price');
    expect(item).toHaveProperty('unit_cost', 35);
  });
});
