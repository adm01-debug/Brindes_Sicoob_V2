import { describe, expect, it } from 'vitest';
import { defaultFilters } from '@/components/filters/FilterPanel';
import { deserializeFilters } from '@/pages/filters/filters-page-helpers';

describe('desserialização dos filtros do catálogo', () => {
  it('não modifica o array de fornecedores do estado padrão', () => {
    const defaults = { ...defaultFilters, suppliers: ['fornecedor-original'] };

    const result = deserializeFilters(new URLSearchParams('supplier=fornecedor-novo'), defaults);

    expect(result.suppliers).toEqual(['fornecedor-original', 'fornecedor-novo']);
    expect(defaults.suppliers).toEqual(['fornecedor-original']);
  });
});
