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
import type { CrmCompany } from '@/types/crm';

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
  const { data } = await supabase.functions.invoke('semantic-search', {
    body: { query: searchQuery },
    signal,
  });
  if (signal.aborted) return null;
  const intent = resolveSearchIntent(data, searchQuery);
  return { intent, results: await searchByIntent(intent, searchQuery) };
}

type QuickSuggestion = { label: string };

function useGlobalSearchShortcuts(
  setOpen: Dispatch<SetStateAction<boolean>>,
  setVoiceOverlayOpen: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === 'V' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
        event.preventDefault();
        setVoiceOverlayOpen(true);
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [setOpen, setVoiceOverlayOpen]);
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
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setResults([]);
      setSearchIntent(null);
      return;
    }
    const cached = searchCache.get(searchQuery);
    if (cached) {
      setResults(cached);
      setIsSearching(false);
      setIsAIProcessing(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    setIsAIProcessing(true);
    try {
      const response = await requestSemanticSearch(searchQuery, controller.signal);
      if (!response) return;
      setIsAIProcessing(false);
      setSearchIntent(response.intent);
      setResults(response.results);
      searchCache.set(searchQuery, response.results);
    } catch (error: unknown) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('Search error:', error);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);
  useEffect(() => {
    if (debouncedQuery) performSearch(debouncedQuery);
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
  useGlobalSearchShortcuts(setOpen, setVoiceOverlayOpen);
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

async function executeClientSearch(intent: SearchIntent): Promise<SearchResult[]> {
  try {
    const { searchCrm } = await import('@/lib/crm-db');
    const searchTerm = intent.filters.clientName || intent.keywords.join(' ');
    if (!searchTerm) return [];

    const companies = await searchCrm<CrmCompany>('companies', 'razao_social', searchTerm, {
      limit: 5,
    });
    return companies.map((c) => ({
      id: c.id,
      title: c.nome_fantasia || c.razao_social,
      subtitle: c.ramo_atividade || 'Empresa',
      type: 'client',
      href: `/cliente/${c.id}`,
    }));
  } catch {
    return [];
  }
}
