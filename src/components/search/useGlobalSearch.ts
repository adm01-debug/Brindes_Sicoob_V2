/**
 * useGlobalSearch — Hook that encapsulates all search logic for GlobalSearchPalette.
 * (REFATORADO para SOLID/Clean Code)
 */
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearch } from '@/hooks/useSearch';
import { useContextualSuggestions } from '@/hooks/useContextualSuggestions';
import { supabase } from '@/integrations/supabase/client';
import { searchCache } from './searchCache';
import { usePopularSearchItems } from '@/hooks/search/usePopularSearchItems';
import { useVoiceSearchAction } from '@/hooks/search/useVoiceSearchAction';
import Fuse from 'fuse.js';
import { createProductFuseOptions, rankProductSearchResults } from '@/utils/product-search';
import type { PromobrindProduct } from '@/lib/external-db';
import { clientDetailPath } from '@/routes/clientRoutes';
import { useProductsContextSafe } from '@/contexts/ProductsContextDef';
import type { Product } from '@/types/product-catalog';

export type SearchResultType =
  | 'product'
  | 'client'
  | 'quote'
  | 'order'
  | 'collection'
  | 'kit'
  | 'mockup'
  | 'art_file'
  | 'cart_template'
  | 'reminder'
  | 'conversation'
  | 'magic_up'
  | 'category'
  | 'component'
  | 'media';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchResultType;
  href: string;
  metadata?: Record<string, unknown>;
}

export interface SearchIntent {
  type: SearchResultType | 'mixed';
  entities?: SearchResultType[];
  filters: {
    category?: string;
    color?: string;
    material?: string;
    priceRange?: 'low' | 'medium' | 'high';
    status?: string;
    clientName?: string;
    dateRange?: 'today' | 'week' | 'month' | 'year';
  };
  keywords: string[];
  originalQuery: string;
}

function createDefaultIntent(searchQuery: string): SearchIntent {
  return {
    type: 'mixed',
    filters: {},
    keywords: searchQuery.split(' ').filter((word) => word.length > 2),
    originalQuery: searchQuery,
  };
}

const SEMANTIC_SEARCH_TIMEOUT_MS = 8000;

function normalizeSearchTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

type AbortRef = { current: AbortController | null };

/** Cancela a busca em voo para que nenhuma resposta atrasada repovoe a lista. */
function cancelPendingSearch(ref: AbortRef): void {
  ref.current?.abort();
  ref.current = null;
}

function isShortQuery(searchQuery: string): boolean {
  return !searchQuery.trim() || searchQuery.length < 3;
}

/** Corre a chamada semântica contra o prazo, sem deixar timer solto. */
function createTimedSearch(searchQuery: string, controller: AbortController) {
  const request = requestSemanticSearch(searchQuery, controller.signal);
  void request.catch(() => undefined);
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve(null);
    }, SEMANTIC_SEARCH_TIMEOUT_MS);
  });
  return {
    didTimeOut: () => timedOut,
    clear: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
    result: Promise.race([request, timeout]),
  };
}

/** Consultar produto e cliente não depende da IA: só a intenção depende. */
async function searchCatalogWithoutIntent(
  searchQuery: string,
): Promise<{ intent: SearchIntent; results: SearchResult[] } | null> {
  try {
    const intent = createDefaultIntent(searchQuery);
    const remote = await searchByIntent(intent, searchQuery);
    return remote.length ? { intent, results: remote } : null;
  } catch (fallbackError: unknown) {
    console.error('Search fallback error:', fallbackError);
    return null;
  }
}

/** Catálogo já carregado: última linha de defesa quando a busca semântica cai. */
export function createLocalSearchFallback(
  searchQuery: string,
  products: Product[] | undefined,
): SearchResult[] {
  const term = normalizeSearchTerm(searchQuery);
  if (!term || !products?.length) return [];
  return products
    .filter((product) => {
      const haystack = [product.name, product.sku, product.category_name ?? product.category?.name ?? '']
        .map((value) => normalizeSearchTerm(String(value ?? '')))
        .join(' ');
      return haystack.includes(term);
    })
    .slice(0, 20)
    .map((product) => ({
      id: product.id,
      title: product.name,
      subtitle: `SKU: ${product.sku} • ${product.category_name || 'Catálogo local'}`,
      type: 'product' as const,
      href: `/produto/${product.id}`,
    }));
}

function resolveSearchIntent(response: unknown, searchQuery: string): SearchIntent {
  const fallback = createDefaultIntent(searchQuery);
  if (!response || typeof response !== 'object') return fallback;
  const candidate = response as { success?: boolean; intent?: SearchIntent };
  return candidate.success && candidate.intent ? candidate.intent : fallback;
}

async function searchByIntent(intent: SearchIntent, searchQuery: string) {
  const results: SearchResult[] = [];
  if (intent.type === 'product' || intent.type === 'mixed') {
    results.push(...(await executeProductSearch(intent, searchQuery)));
  }
  if (intent.type === 'client' || intent.type === 'mixed') {
    results.push(...(await executeClientSearch(intent)));
  }
  return results;
}

async function requestSemanticSearch(searchQuery: string, signal: AbortSignal) {
  const { data, error } = await supabase.functions.invoke('semantic-search', {
    body: { query: searchQuery },
    signal,
  });
  if (error) throw error;
  if (signal.aborted) return null;
  const intent = resolveSearchIntent(data, searchQuery);
  return { intent, results: await searchByIntent(intent, searchQuery) };
}

type QuickSuggestion = { label: string };

function useVoiceSearchShortcut(setVoiceOverlayOpen: Dispatch<SetStateAction<boolean>>) {
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'V' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
        event.preventDefault();
        setVoiceOverlayOpen(true);
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [setVoiceOverlayOpen]);
}

function useTypingSuggestions(
  query: string,
  history: string[],
  quickSuggestions: QuickSuggestion[],
): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    if (query.length < 2 || query.length >= 5) {
      setSuggestions([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const matches = new Set<string>();
    history.forEach((term) => {
      if (term.toLowerCase().startsWith(lowerQuery)) matches.add(term);
    });
    quickSuggestions.forEach((suggestion) => {
      if (suggestion.label.toLowerCase().includes(lowerQuery)) matches.add(suggestion.label);
    });
    setSuggestions(Array.from(matches).slice(0, 5));
  }, [query, history, quickSuggestions]);
  return suggestions;
}

function useSemanticSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [searchIntent, setSearchIntent] = useState<SearchIntent | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebounce(query, 500);
  const productsContext = useProductsContextSafe();
  const localProductsRef = useRef<Product[]>([]);
  localProductsRef.current = productsContext?.products ?? [];
  useEffect(() => () => abortRef.current?.abort(), []);
  const performSearch = useCallback(async (searchQuery: string) => {
    if (isShortQuery(searchQuery)) {
      // Sem isso, a consulta remota iniciada na falha da IA retorna depois e
      // repovoa a lista de uma busca que ja foi apagada.
      cancelPendingSearch(abortRef);
      setResults([]);
      setSearchIntent(null);
      setIsSearching(false);
      setIsAIProcessing(false);
      return;
    }
    const cached = searchCache.get(searchQuery);
    if (cached) {
      setResults(cached);
      setSearchIntent(createDefaultIntent(searchQuery));
      setIsSearching(false);
      setIsAIProcessing(false);
      return;
    }
    cancelPendingSearch(abortRef);
    const controller = new AbortController();
    abortRef.current = controller;
    const timed = createTimedSearch(searchQuery, controller);
    // Mostra já o catálogo em memória e, se os serviços de catálogo e CRM
    // estiverem no ar, troca pelo resultado completo.
    const applyFallback = async () => {
      const local = createLocalSearchFallback(searchQuery, localProductsRef.current);
      // Vazio é resposta válida: o resultado anterior não pode sobreviver aqui,
      // senão o estado vazio não aparece e Ctrl+Enter abre o produto errado.
      setSearchIntent(local.length ? createDefaultIntent(searchQuery) : null);
      setResults(local);
      const upgraded = await searchCatalogWithoutIntent(searchQuery);
      if (!upgraded || abortRef.current !== controller) return;
      setSearchIntent(upgraded.intent);
      setResults(upgraded.results);
    };
    setIsSearching(true);
    setIsAIProcessing(true);
    try {
      const response = await timed.result;
      if (abortRef.current !== controller) return;
      if (!response) {
        void applyFallback();
        return;
      }
      setIsAIProcessing(false);
      setSearchIntent(response.intent);
      setResults(response.results);
      searchCache.set(searchQuery, response.results);
    } catch (error: unknown) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (!aborted) console.error('Search error:', error);
      // Aborto causado por uma busca mais nova não é falha: quem assumiu responde.
      if (aborted && !timed.didTimeOut()) return;
      void applyFallback();
    } finally {
      timed.clear();
      setIsSearching(false);
      setIsAIProcessing(false);
    }
  }, []);
  useEffect(() => {
    // Apagar o termo passa por aqui também, para limpar o resultado anterior.
    void performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((result) => (groups[result.type] ||= []).push(result));
    return groups;
  }, [results]);
  return { results, setResults, groupedResults, isSearching, isAIProcessing, searchIntent };
}

interface GlobalSearchActionContext {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setVoiceOverlayOpen: Dispatch<SetStateAction<boolean>>;
  addToHistory: (term: string) => void;
  removeFromHistory: (term: string) => void;
}

function useGlobalSearchActions({
  query,
  setQuery,
  setOpen,
  setVoiceOverlayOpen,
  addToHistory,
  removeFromHistory,
}: GlobalSearchActionContext) {
  const navigate = useNavigate();
  const handleSelect = useCallback(
    (href: string) => {
      if (query.trim()) addToHistory(query.trim());
      setOpen(false);
      if (href) navigate(href);
    },
    [addToHistory, navigate, query, setOpen],
  );
  const handleSuggestionClick = useCallback((term: string) => setQuery(term), [setQuery]);
  const handleRemoveFromHistory = useCallback(
    (term: string) => removeFromHistory(term),
    [removeFromHistory],
  );
  const handleOpenVoiceOverlay = useCallback(
    () => setVoiceOverlayOpen(true),
    [setVoiceOverlayOpen],
  );
  const handleCloseVoiceOverlay = useCallback(
    () => setVoiceOverlayOpen(false),
    [setVoiceOverlayOpen],
  );
  return {
    handleSelect,
    handleSuggestionClick,
    handleRemoveFromHistory,
    handleOpenVoiceOverlay,
    handleCloseVoiceOverlay,
  };
}

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const search = useSemanticSearch(query);
  const { history, quickSuggestions, addToHistory, removeFromHistory } = useSearch();
  const { suggestions: contextualSuggestions, routeContext } = useContextualSuggestions({
    searchQuery: query,
  });
  const typingSuggestions = useTypingSuggestions(query, history, quickSuggestions);
  const popularProducts = usePopularSearchItems(open).data || [];
  const { handleVoiceAction } = useVoiceSearchAction(
    setOpen,
    setVoiceOverlayOpen,
    setQuery,
    search.setResults,
  );
  const actions = useGlobalSearchActions({
    query,
    setQuery,
    setOpen,
    setVoiceOverlayOpen,
    addToHistory,
    removeFromHistory,
  });
  useVoiceSearchShortcut(setVoiceOverlayOpen);
  return {
    open,
    setOpen,
    query,
    setQuery,
    results: search.results,
    groupedResults: search.groupedResults,
    isSearching: search.isSearching,
    isAIProcessing: search.isAIProcessing,
    searchIntent: search.searchIntent,
    popularProducts,
    typingSuggestions,
    voiceOverlayOpen,
    handleVoiceAction,
    setVoiceOverlayOpen,
    contextualSuggestions,
    history,
    quickSuggestions,
    routeContext,
    ...actions,
  };
}

// ── Private Helpers ──

async function executeProductSearch(
  intent: SearchIntent,
  searchQuery: string,
): Promise<SearchResult[]> {
  try {
    const { fetchPromobrindProducts } = await import('@/lib/external-db');
    const { dedupeById } = await import('@/utils/product-search');
    const productQuery = intent.keywords.join(' ') || searchQuery;

    const [prefixData, broadData] = await Promise.all([
      fetchPromobrindProducts({ filters: { _name_prefix: productQuery }, limit: 100 }),
      fetchPromobrindProducts({ search: productQuery, limit: 100 }),
    ]);

    let filteredProducts = dedupeById([...prefixData, ...broadData]);

    if (intent.filters.category) {
      const cat = intent.filters.category.toLowerCase();
      filteredProducts = filteredProducts.filter((p) =>
        p.category_name?.toLowerCase().includes(cat),
      );
    }

    const fuse = new Fuse(filteredProducts, createProductFuseOptions<PromobrindProduct>());
    return rankProductSearchResults(filteredProducts, productQuery, fuse).map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `SKU: ${p.sku} • ${p.category_name || 'Catálogo'}`,
      type: 'product',
      href: `/produto/${p.id}`,
    }));
  } catch {
    return [];
  }
}

export async function executeClientSearch(intent: SearchIntent): Promise<SearchResult[]> {
  try {
    // O `search` genérico do CRM é negado para vendedor e agente; o contrato
    // fechado `quote_directory` é o único liberado e exige termo com 2+
    // caracteres, então o corte abaixo evita uma ida ao Edge que voltaria 403.
    const { fetchQuoteDirectoryCompanies } = await import('@/lib/crm-db');
    const searchTerm = (intent.filters.clientName || intent.keywords.join(' ')).trim();
    if (searchTerm.length < 2) return [];

    const companies = await fetchQuoteDirectoryCompanies({ term: searchTerm, limit: 5 });
    return companies.map((c) => ({
      id: c.id,
      title: c.nome_fantasia || c.razao_social,
      subtitle: c.ramo_atividade || 'Empresa',
      type: 'client',
      href: clientDetailPath(c.id),
    }));
  } catch {
    return [];
  }
}
