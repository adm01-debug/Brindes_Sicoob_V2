/**
 * useGlobalSearch — Hook that encapsulates all search logic for GlobalSearchPalette.
 * (REFATORADO para SOLID/Clean Code)
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearch } from "@/hooks/useSearch";
import { useContextualSuggestions } from "@/hooks/useContextualSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { searchCache } from "./searchCache";
import { usePopularSearchItems } from "@/hooks/search/usePopularSearchItems";
import { useVoiceSearchAction } from "@/hooks/search/useVoiceSearchAction";
import Fuse from "fuse.js";
import { createProductFuseOptions, rankProductSearchResults } from "@/utils/product-search";
import type { ExternalProduct } from "@/types/external-db";

export type SearchResultType = "product" | "client" | "quote" | "order" | "collection" | "kit" | "mockup" | "art_file" | "cart_template" | "reminder" | "conversation" | "magic_up" | "category" | "component" | "media";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchResultType;
  href: string;
  metadata?: Record<string, unknown>;
}

export interface SearchIntent {
  type: SearchResultType | "mixed";
  entities?: SearchResultType[];
  filters: {
    category?: string;
    color?: string;
    material?: string;
    priceRange?: "low" | "medium" | "high";
    status?: string;
    clientName?: string;
    dateRange?: "today" | "week" | "month" | "year";
  };
  keywords: string[];
  originalQuery: string;
}

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [searchIntent, setSearchIntent] = useState<SearchIntent | null>(null);
  const [typingSuggestions, setTypingSuggestions] = useState<string[]>([]);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  
  const debouncedQuery = useDebounce(query, 500);
  const { history, quickSuggestions } = useSearch();
  const { suggestions: contextualSuggestions } = useContextualSuggestions({ searchQuery: query });
  const popularProducts = usePopularSearchItems(open);
  
  const { handleVoiceAction } = useVoiceSearchAction(setOpen, setVoiceOverlayOpen, setQuery, setResults);

  // ── Keyboard shortcut ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o); }
      if (e.key === "V" && (e.metaKey || e.ctrlKey) && e.shiftKey) { e.preventDefault(); setVoiceOverlayOpen(true); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // ── Typing suggestions logic ──
  useEffect(() => {
    if (query.length >= 2 && query.length < 5) {
      const lowerQuery = query.toLowerCase();
      const suggestions = new Set<string>();
      history.forEach(h => { if (h.toLowerCase().startsWith(lowerQuery)) suggestions.add(h); });
      quickSuggestions.forEach(qs => { if (qs.label.toLowerCase().includes(lowerQuery)) suggestions.add(qs.label); });
      setTypingSuggestions(Array.from(suggestions).slice(0, 5));
    } else {
      setTypingSuggestions([]);
    }
  }, [query, history, quickSuggestions]);

  const abortRef = useRef<AbortController | null>(null);

  // ── Search Execution (Simplified) ──
  const performSemanticSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) { setResults([]); setSearchIntent(null); return; }

    const cached = searchCache.get(searchQuery);
    if (cached) { setResults(cached); setIsSearching(false); setIsAIProcessing(false); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true); setIsAIProcessing(true);
    try {
      const { data: aiResponse } = await supabase.functions.invoke("semantic-search", { 
        body: { query: searchQuery },
        signal: controller.signal
      });
      
      if (controller.signal.aborted) return;
      setIsAIProcessing(false);

      let intent: SearchIntent = { 
        type: "mixed", 
        filters: {}, 
        keywords: searchQuery.split(" ").filter(w => w.length > 2), 
        originalQuery: searchQuery 
      };
      
      if (aiResponse?.success && aiResponse?.intent) { 
        intent = aiResponse.intent; 
        setSearchIntent(intent); 
      }

      const allResults: SearchResult[] = [];

      // Logic specialized by type (Extracted for readability)
      if (intent.type === "product" || intent.type === "mixed") {
        const productResults = await executeProductSearch(intent, searchQuery);
        allResults.push(...productResults);
      }

      if (intent.type === "client" || intent.type === "mixed") {
        const clientResults = await executeClientSearch(intent);
        allResults.push(...clientResults);
      }

      setResults(allResults);
      searchCache.set(searchQuery, allResults);
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) performSemanticSearch(debouncedQuery);
  }, [debouncedQuery, performSemanticSearch]);

  return {
    open, setOpen, query, setQuery, results, isSearching, isAIProcessing,
    searchIntent, popularProducts, typingSuggestions, voiceOverlayOpen,
    handleVoiceAction, setVoiceOverlayOpen, contextualSuggestions
  };
}

// ── Private Helpers ──

async function executeProductSearch(intent: SearchIntent, searchQuery: string): Promise<SearchResult[]> {
  try {
    const { fetchPromobrindProducts } = await import("@/lib/external-db");
    const { dedupeById } = await import("@/utils/product-search");
    const productQuery = intent.keywords.join(" ") || searchQuery;
    
    const [prefixData, broadData] = await Promise.all([
      fetchPromobrindProducts({ filters: { _name_prefix: productQuery }, limit: 100 }),
      fetchPromobrindProducts({ search: productQuery, limit: 100 }),
    ]);
    
    let filteredProducts = dedupeById([...prefixData, ...broadData]);

    if (intent.filters.category) {
      const cat = intent.filters.category.toLowerCase();
      filteredProducts = filteredProducts.filter(p => p.category_name?.toLowerCase().includes(cat));
    }

    const fuse = new Fuse(filteredProducts, createProductFuseOptions<ExternalProduct>());
    return rankProductSearchResults(filteredProducts, productQuery, fuse).map(p => ({
      id: p.id, title: p.name,
      subtitle: `SKU: ${p.sku} • ${p.category_name || "Catálogo"}`,
      type: "product", href: `/produto/${p.id}`,
    }));
  } catch { return []; }
}

async function executeClientSearch(intent: SearchIntent): Promise<SearchResult[]> {
  try {
    const { searchCrm } = await import("@/lib/crm-db");
    const searchTerm = intent.filters.clientName || intent.keywords.join(" ");
    if (!searchTerm) return [];
    
    const companies = await searchCrm<any>("companies", "razao_social", searchTerm, { limit: 5 });
    return companies.map(c => ({
      id: c.id, title: c.nome_fantasia || c.razao_social,
      subtitle: c.ramo || "Empresa", type: "client", href: `/cliente/${c.id}`
    }));
  } catch { return []; }
}
