import { describe, expect, it } from 'vitest';
import { redactInternalCatalogFields } from '../../supabase/functions/_shared/catalog-redaction.ts';

describe('redactInternalCatalogFields', () => {
  it('remove custos, margem e fornecedor em qualquer nível da resposta', () => {
    const safe = redactInternalCatalogFields({
      name: 'Garrafa',
      sale_price: 49.9,
      setup_cost: 25,
      unit_cost: 8,
      total_cost: 41,
      supplier_id: 'fornecedor-1',
      variant: { color: 'Verde', production_cost: 4, markup_percent: 30 },
      rows: [{ sku: 'GAR-1', internal_cost: 2, supplier_name: 'Interno' }],
    });

    expect(safe).toEqual({
      name: 'Garrafa',
      sale_price: 49.9,
      variant: { color: 'Verde' },
      rows: [{ sku: 'GAR-1' }],
    });
  });
});
