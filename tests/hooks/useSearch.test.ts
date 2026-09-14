import { describe, it, expect, vi, beforeEach } from 'vitest';

// useSearch buscava categorias/fornecedores de @/data/mockData (dado
// hardcoded e desatualizado, ex.: "BRINDES SICOOB" e "XBZ Brindes"
// congelados no código-fonte). Migrado pra useExternalCategoriesQuery/
// useSuppliers (catálogo real) — ver docs/correcoes-validacao-2026-09-14.md.
// Mock direto dos dois hooks: nenhum precisa de QueryClientProvider no
// teste porque a implementação real de useQuery nunca roda.
vi.mock('@/hooks/useExternalCategoriesQuery', () => ({
  useExternalCategoriesQuery: () => ({
    data: [
      { id: 'cat-1', name: 'Canetas' },
      { id: 'cat-2', name: 'Garrafas Térmicas' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useSuppliers', () => ({
  useSuppliers: () => ({
    suppliers: [
      { id: 'sup-1', name: 'BIC' },
      { id: 'sup-2', name: 'Stanley' },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { renderHook, act } from '@testing-library/react';
import { useSearch } from '@/hooks/useSearch';
import type { Product } from '@/hooks/useProducts';

// Minimal product mock
const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: `prod-${Math.random().toString(36).slice(2)}`,
  name: 'Caneta Esferográfica',
  sku: 'CAN-001',
  price: 5.90,
  image_url: '',
  category_name: 'Escritório',
  brand: 'BIC',
  description: 'Caneta azul',
  supplier_reference: 'SUP-001',
  stock_status: 'in_stock',
  ...overrides,
} as Product);

describe('useSearch', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Histórico', () => {
    it('isola o histórico por escopo de usuário e cooperativa', () => {
      const first = renderHook(() => useSearch([], 'user:ana:cooperativa:1:pa:10'));
      act(() => first.result.current.addToHistory('caneta ecológica'));

      const second = renderHook(() => useSearch([], 'user:bruno:cooperativa:2:pa:20'));
      expect(second.result.current.history).toEqual([]);

      const sameScope = renderHook(() => useSearch([], 'user:ana:cooperativa:1:pa:10'));
      expect(sameScope.result.current.history).toContain('caneta ecológica');
    });

    it('adiciona termo ao histórico', () => {
      const { result } = renderHook(() => useSearch([]));
      act(() => result.current.addToHistory('caneta'));
      expect(result.current.history).toContain('caneta');
    });

    it('remove duplicatas do histórico (case-insensitive)', () => {
      const { result } = renderHook(() => useSearch([]));
      act(() => {
        result.current.addToHistory('Caneta');
        result.current.addToHistory('caneta');
      });
      expect(result.current.history.filter(h => h.toLowerCase() === 'caneta').length).toBe(1);
    });

    it('limita histórico a 10 itens', () => {
      const { result } = renderHook(() => useSearch([]));
      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.addToHistory(`termo-${i}`);
        }
      });
      expect(result.current.history.length).toBeLessThanOrEqual(10);
    });

    it('remove termo específico do histórico', () => {
      const { result } = renderHook(() => useSearch([]));
      act(() => {
        result.current.addToHistory('caneta');
        result.current.addToHistory('garrafa');
      });
      act(() => result.current.removeFromHistory('caneta'));
      expect(result.current.history).not.toContain('caneta');
      expect(result.current.history).toContain('garrafa');
    });

    it('limpa todo o histórico', () => {
      const { result } = renderHook(() => useSearch([]));
      act(() => {
        result.current.addToHistory('termo1');
        result.current.addToHistory('termo2');
      });
      act(() => result.current.clearHistory());
      expect(result.current.history.length).toBe(0);
    });

    it('não adiciona strings vazias ao histórico', () => {
      const { result } = renderHook(() => useSearch([]));
      act(() => result.current.addToHistory(''));
      act(() => result.current.addToHistory('   '));
      expect(result.current.history.length).toBe(0);
    });
  });

  describe('Busca e relevância', () => {
    const products = [
      makeProduct({ id: '1', name: 'Caneta Touch Screen', sku: 'CTS-100' }),
      makeProduct({ id: '2', name: 'Caneta Esferográfica', sku: 'CAN-200' }),
      makeProduct({ id: '3', name: 'Porta Caneta Acrílico', sku: 'PCA-300' }),
      makeProduct({ id: '4', name: 'Garrafa Térmica 500ml', sku: 'GAR-400' }),
    ];

    it('retorna resultados para query válida', () => {
      const { result } = renderHook(() => useSearch(products));
      act(() => result.current.setQuery('caneta'));
      const productResults = result.current.suggestions.filter(s => s.type === 'product');
      expect(productResults.length).toBeGreaterThanOrEqual(2);
    });

    it('prioriza "starts with" sobre "contains"', () => {
      const { result } = renderHook(() => useSearch(products));
      act(() => result.current.setQuery('caneta'));
      const productResults = result.current.suggestions.filter(s => s.type === 'product');
      // "Caneta Touch" and "Caneta Esferográfica" should come before "Porta Caneta"
      const firstTwo = productResults.slice(0, 2).map(r => r.id);
      expect(firstTwo).toContain('1');
      expect(firstTwo).toContain('2');
    });

    it('busca por SKU exato tem prioridade máxima', () => {
      const { result } = renderHook(() => useSearch(products));
      act(() => result.current.setQuery('CTS-100'));
      const productResults = result.current.suggestions.filter(s => s.type === 'product');
      expect(productResults.length).toBeGreaterThanOrEqual(1);
      expect(productResults[0].id).toBe('1');
    });

    it('não retorna resultados para query < 2 caracteres', () => {
      const { result } = renderHook(() => useSearch(products));
      act(() => result.current.setQuery('c'));
      const productResults = result.current.suggestions.filter(s => s.type !== 'history');
      expect(productResults.length).toBe(0);
    });

    it('retorna histórico quando query está vazia', () => {
      const { result } = renderHook(() => useSearch(products));
      act(() => result.current.addToHistory('caneta'));
      act(() => result.current.setQuery(''));
      const historyResults = result.current.suggestions.filter(s => s.type === 'history');
      expect(historyResults.length).toBeGreaterThanOrEqual(1);
    });

    it('limita produtos a no máximo 6 resultados', () => {
      const manyProducts = Array.from({ length: 20 }, (_, i) =>
        makeProduct({ id: `p${i}`, name: `Caneta Modelo ${i}` })
      );
      const { result } = renderHook(() => useSearch(manyProducts));
      act(() => result.current.setQuery('caneta'));
      const productResults = result.current.suggestions.filter(s => s.type === 'product');
      expect(productResults.length).toBeLessThanOrEqual(7); // 6 + possible SKU exact
    });
  });

  describe('Categorias e fornecedores (catálogo real, não mockData)', () => {
    it('sugere categoria do catálogo real (useExternalCategoriesQuery), não a lista hardcoded antiga', () => {
      const { result } = renderHook(() => useSearch([]));
      act(() => result.current.setQuery('caneta'));
      const categoryResults = result.current.suggestions.filter(s => s.type === 'category');
      expect(categoryResults.map(c => c.label)).toContain('Canetas');
      // "BRINDES SICOOB" era uma categoria da lista antiga hardcoded em
      // @/data/mockData — não deve mais aparecer, pois não veio do mock.
      expect(categoryResults.map(c => c.label)).not.toContain('BRINDES SICOOB');
    });

    it('sugere fornecedor do catálogo real (useSuppliers), não a lista hardcoded antiga', () => {
      const { result } = renderHook(() => useSearch([]));
      act(() => result.current.setQuery('bic'));
      const supplierResults = result.current.suggestions.filter(s => s.type === 'supplier');
      expect(supplierResults.map(s => s.label)).toContain('BIC');
      // "XBZ Brindes" era um fornecedor da lista antiga hardcoded.
      expect(supplierResults.map(s => s.label)).not.toContain('XBZ Brindes');
    });
  });

  describe('Quick suggestions', () => {
    it('retorna sugestões rápidas', () => {
      const { result } = renderHook(() => useSearch([]));
      expect(result.current.quickSuggestions.length).toBeGreaterThan(0);
    });

    it('cada sugestão tem label e icon', () => {
      const { result } = renderHook(() => useSearch([]));
      result.current.quickSuggestions.forEach(s => {
        expect(s.label).toBeTruthy();
        expect(s.icon).toBeTruthy();
      });
    });
  });
});
