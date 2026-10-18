import { describe, expect, it } from 'vitest';
import { defaultFilters } from '@/components/filters/FilterPanel';
import {
  applyProductFilters,
  deserializeFilters,
  serializeFilters,
} from '@/pages/filters/filters-page-helpers';
import type { Product } from '@/types/product-catalog';

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: `Produto ${id}`,
    sku: `SKU-${id}`,
    price: 10,
    images: [],
    stock: 10,
    colors: [],
    materials: [],
    minQuantity: 1,
    stockStatus: 'in-stock',
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category: { id: 'categoria', name: 'Categoria' },
    supplier: { id: 'fornecedor', name: 'Fornecedor' },
    tags: { publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [] },
    ...overrides,
  };
}

function apply(products: Product[], filters = defaultFilters, relations: Partial<Parameters<typeof applyProductFilters>[0]> = {}) {
  return applyProductFilters({
    filters,
    products,
    materialIds: new Set(),
    categoryIds: new Set(),
    colorIds: new Set(),
    tagIds: new Set(),
    techniqueIds: new Set(),
    sizeIds: new Set(),
    activityIds: new Set(),
    marketingIds: new Set(),
    commemorativeDateIds: new Set(),
    hasMaterialFilter: false,
    hasCategoryFilter: false,
    hasColorFilter: false,
    hasTagFilter: false,
    hasTechniqueFilter: false,
    hasSizeFilter: false,
    hasActivityFilter: false,
    hasMarketingFilter: false,
    hasCommemorativeDateFilter: false,
    loadingMaterial: false,
    loadingCategory: false,
    loadingColor: false,
    loadingTag: false,
    loadingTechnique: false,
    loadingSize: false,
    loadingActivity: false,
    loadingMarketing: false,
    loadingCommemorativeDate: false,
    sortBy: 'name',
    skipSort: false,
    ...relations,
  });
}

describe('desserialização dos filtros do catálogo', () => {
  it('não modifica o array de fornecedores do estado padrão', () => {
    const defaults = { ...defaultFilters, suppliers: ['fornecedor-original'] };

    const result = deserializeFilters(new URLSearchParams('supplier=fornecedor-novo'), defaults);

    expect(result.suppliers).toEqual(['fornecedor-original', 'fornecedor-novo']);
    expect(defaults.suppliers).toEqual(['fornecedor-original']);
  });

  it('preserva embalagem comercial e tiragem mínima no endereço compartilhável', () => {
    const filters = {
      ...defaultFilters,
      hasCommercialPackaging: true,
      minQuantity: 250,
    };
    const serialized = serializeFilters(filters);
    expect(serialized.get('hasCommercialPackaging')).toBe('1');
    expect(serialized.get('minQuantity')).toBe('250');
    expect(deserializeFilters(serialized, defaultFilters)).toMatchObject(filters);
  });
});

describe('aplicação dos filtros do catálogo', () => {
  const products = [
    product('a', { featured: true, newArrival: true, allowsPersonalization: true, gender: 'Unissex' }),
    product('b', { isKit: true, hasCommercialPackaging: true, gender: 'Masculino' }),
  ];

  it.each([
    ['featured', 'a'],
    ['isNew', 'a'],
    ['hasPersonalization', 'a'],
    ['hasCommercialPackaging', 'b'],
    ['isKit', 'b'],
  ] as const)('aplica a opção rápida %s', (key, expectedId) => {
    const filters = { ...defaultFilters, [key]: true };
    expect(apply(products, filters).map((item) => item.id)).toEqual([expectedId]);
  });

  it('normaliza gênero sem depender de caixa', () => {
    const filters = { ...defaultFilters, gender: ['unissex'] };
    expect(apply(products, filters).map((item) => item.id)).toEqual(['a']);
  });

  it.each([
    ['tag', 'b', { hasTagFilter: true, tagIds: new Set(['b']) }],
    ['técnica', 'a', { hasTechniqueFilter: true, techniqueIds: new Set(['a']) }],
    ['tamanho', 'b', { hasSizeFilter: true, sizeIds: new Set(['b']) }],
    ['ramo de atividade', 'a', { hasActivityFilter: true, activityIds: new Set(['a']) }],
    ['marketing editorial', 'b', { hasMarketingFilter: true, marketingIds: new Set(['b']) }],
    ['data comemorativa', 'a', { hasCommemorativeDateFilter: true, commemorativeDateIds: new Set(['a']) }],
  ] as const)('aplica o conjunto relacional de %s', (_label, expectedId, relations) => {
    expect(apply(products, defaultFilters, relations).map((item) => item.id)).toEqual([expectedId]);
  });
});
