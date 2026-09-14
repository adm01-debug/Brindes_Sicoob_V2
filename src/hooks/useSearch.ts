import { useState, useEffect, useMemo, useCallback, useContext } from "react";
import Fuse from "fuse.js";
import { type Product } from "@/hooks/useProducts";
import { useExternalCategoriesQuery } from "@/hooks/useExternalCategoriesQuery";
import { useSuppliers } from "@/hooks/useSuppliers";
import { ProductsContext } from "@/contexts/ProductsContext";
import { createProductFuseOptions, rankProductSearchResults } from "@/utils/product-search";

const HISTORY_KEY_PREFIX = "search-history";
const MAX_HISTORY = 10;

function getHistoryKey(scope?: string): string {
  const normalizedScope = (scope || 'public').trim().replace(/[^a-zA-Z0-9:_-]/g, '_');
  return `${HISTORY_KEY_PREFIX}:${normalizedScope || 'public'}`;
}

// This hook now relies on ProductsContext for product data
// Products are passed externally or fetched via context

export interface SearchResult {
  type: "product" | "category" | "supplier" | "history";
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  data?: Product;
}

export function useSearch(products: Product[] = [], historyScope?: string) {
  const productsContext = useContext(ProductsContext);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const historyKey = useMemo(() => getHistoryKey(historyScope), [historyScope]);

  const availableProducts = products.length > 0 ? products : (productsContext?.products || []);

  // Categorias e fornecedores do catálogo real — antes vinham de listas
  // hardcoded em @/data/mockData (nomes reais como "BRINDES SICOOB", "XBZ
  // Brindes" congelados no código-fonte, nunca refletindo altas/baixas/
  // renomeações reais). useSuppliers() já existe especificamente pra
  // substituir isso ("Substitui o uso de SUPPLIERS do mockData") mas
  // useSearch nunca tinha sido migrado. Ver docs/correcoes-validacao-2026-09-14.md.
  const { data: externalCategories } = useExternalCategoriesQuery();
  const { suppliers: externalSuppliers } = useSuppliers();

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading search history:", e);
    }
    setIsLoaded(true);
  }, [historyKey]);

  // Save history to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  }, [history, isLoaded, historyKey]);

  const addToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const removeFromHistory = useCallback((term: string) => {
    setHistory((prev) => prev.filter((h) => h !== term));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Criar instância Fuse.js para busca fuzzy de produtos
  const productFuse = useMemo(() => new Fuse(availableProducts, createProductFuseOptions<Product>({
    threshold: 0.35,
  })), [availableProducts]);

  // Criar instância Fuse.js para busca fuzzy de categorias
  const categoryFuse = useMemo(() => new Fuse(externalCategories ?? [], {
    keys: ['name'],
    threshold: 0.35,
    ignoreLocation: true,
  }), [externalCategories]);

  // Criar instância Fuse.js para busca fuzzy de fornecedores
  const supplierFuse = useMemo(() => new Fuse(externalSuppliers, {
    keys: ['name'],
    threshold: 0.35,
    ignoreLocation: true,
  }), [externalSuppliers]);

  // Generate suggestions based on query - usando busca fuzzy
  const suggestions = useMemo((): SearchResult[] => {
    const results: SearchResult[] = [];
    const searchTerm = query.trim();

    // If no query, show recent history
    if (!searchTerm) {
      history.slice(0, 5).forEach((term) => {
        results.push({
          type: "history",
          id: `history-${term}`,
          label: term,
          icon: "🕐",
        });
      });
      return results;
    }

    // Se termo muito curto, não buscar
    if (searchTerm.length < 2) {
      return results;
    }

    // Search products - busca fuzzy com priorização por relevância
    const searchLower = searchTerm.toLowerCase();

    // Priority 0: Exact SKU match (most precise)
      const exactSkuMatch = availableProducts.find(p => 
        p.sku?.toLowerCase() === searchLower || 
        p.supplier_reference?.toLowerCase() === searchLower
      );
    if (exactSkuMatch) {
      results.push({
        type: "product",
        id: exactSkuMatch.id,
        label: exactSkuMatch.name,
        sublabel: `SKU: ${exactSkuMatch.sku || ''} • ${exactSkuMatch.category_name || ''}`,
        icon: "📦",
        data: exactSkuMatch,
      });
    }
    
    const orderedProducts = rankProductSearchResults(availableProducts, searchTerm, productFuse)
      .slice(0, 6);

    orderedProducts.forEach((product) => {
      // Skip if already added as exact SKU match
      if (results.some(r => r.id === product.id)) return;
      results.push({
        type: "product",
        id: product.id,
        label: product.name,
        sublabel: `${product.sku || ''} • ${product.category_name || ''}`,
        icon: "📦",
        data: product,
      });
    });

    // Search categories - busca fuzzy
    const matchingCategories = categoryFuse.search(searchTerm).slice(0, 3);

    matchingCategories.forEach((result) => {
      const category = result.item;
      const productCount = availableProducts.filter((p) =>
        p.category_id === category.id
      ).length;
      results.push({
        type: "category",
        id: category.id,
        label: category.name,
        sublabel: `${productCount} produtos`,
        icon: "📁",
      });
    });

    // Search suppliers - busca fuzzy
    const matchingSuppliers = supplierFuse.search(searchTerm).slice(0, 3);

    matchingSuppliers.forEach((result) => {
      const supplier = result.item;
      const productCount = availableProducts.filter((p) => 
        p.brand === supplier.id || p.supplier_reference === supplier.id
      ).length;
      results.push({
        type: "supplier",
        id: supplier.id,
        label: supplier.name,
        sublabel: `${productCount} produtos`,
        icon: "🏭",
      });
    });

    return results;
  }, [query, history, availableProducts, productFuse, categoryFuse, supplierFuse]);

  // Quick suggestions (popular/trending)
  const quickSuggestions = useMemo(() => {
    return [
      { label: "Canetas", icon: "🖊️" },
      { label: "Garrafas", icon: "🍶" },
      { label: "Ecológico", icon: "🌱" },
      { label: "Tecnologia", icon: "💻" },
      { label: "Kits", icon: "🎁" },
    ];
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    quickSuggestions,
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    isLoaded,
  };
}
