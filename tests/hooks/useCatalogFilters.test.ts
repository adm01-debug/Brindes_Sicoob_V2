import { describe, expect, it } from 'vitest';
import { defaultFilters } from '@/components/filters/FilterPanel';
import { countActiveFilters } from '@/hooks/catalog/useCatalogFilters';

describe('contagem dos filtros da vitrine principal', () => {
  it('não considera o estado padrão como filtrado', () => {
    expect(countActiveFilters(defaultFilters)).toBe(0);
  });

  it('contabiliza filtros relacionais, editoriais e opções rápidas', () => {
    expect(countActiveFilters({
      ...defaultFilters,
      tags: ['sustentavel'],
      techniques: ['laser'],
      sizes: ['M'],
      sicoobThemes: ['agro'],
      hasPersonalization: true,
    })).toBe(5);
  });

  it('contabiliza busca, estoque mínimo e faixa de preço personalizada', () => {
    expect(countActiveFilters({
      ...defaultFilters,
      search: 'caneca',
      minStock: 100,
      priceRange: [10, 900],
    })).toBe(3);
  });

  it('contabiliza tiragem mínima e embalagem comercial', () => {
    expect(countActiveFilters({
      ...defaultFilters,
      minQuantity: 100,
      hasCommercialPackaging: true,
    })).toBe(2);
  });
});
