import { type FormEvent, type KeyboardEvent, type RefObject, useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Clock, TrendingUp, ArrowRight, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VisualSearchButton } from "./VisualSearchButton";
import { cn } from "@/lib/utils";
import { useSearch, type SearchResult } from "@/hooks/useSearch";
import type { VoiceAgentAction } from "@/hooks/voice/types";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const LazyVoiceOverlay = lazyWithRetry(() => import("./VoiceSearchOverlayConnected"));

interface ProductAnalysis {
  productType: string;
  material: string;
  colors: string[];
  category: string;
  keywords: string[];
  description: string;
}

interface AdvancedSearchProps {
  onSearch?: (query: string) => void;
  onVisualSearchResults?: (products: unknown[], analysis: ProductAnalysis) => void;
  className?: string;
}

function buildVoiceQuery(action: VoiceAgentAction): string {
  const filterParts = [action.data?.filters?.category, action.data?.filters?.color].filter((value): value is string => Boolean(value));
  return action.data?.query || filterParts.join(' ');
}

function applyVoiceAction({ action, setQuery, close, navigate, onSearch }: { action: VoiceAgentAction; setQuery: (query: string) => void; close: () => void; navigate: ReturnType<typeof useNavigate>; onSearch?: (query: string) => void }) {
  if (action.action === 'navigate') { if (action.data?.route) { close(); navigate(action.data.route); } return; }
  if (action.action === 'clear') { close(); setQuery(''); return; }
  if (action.action !== 'search' && action.action !== 'filter') return;
  const finalQuery = buildVoiceQuery(action);
  if (finalQuery) { close(); setQuery(finalQuery); onSearch?.(finalQuery); }
}

function routeSearchResult({ result, navigate, setQuery, addToHistory, onSearch }: { result: SearchResult; navigate: ReturnType<typeof useNavigate>; setQuery: (query: string) => void; addToHistory: (query: string) => void; onSearch?: (query: string) => void }) {
  if (result.type === 'product') navigate(`/produto/${result.id}`);
  else if (result.type === 'category') navigate(`/filtros?categoria=${result.id}`);
  else if (result.type === 'supplier') navigate(`/filtros?fornecedor=${result.id}`);
  else { setQuery(result.label); onSearch?.(result.label); return; }
  addToHistory(result.label);
}

function SearchInputBar({ query, voiceSupported, inputRef, onSubmit, onQueryChange, onFocus, onKeyDown, onClear, onVisualSearchResults, onVoice }: { query: string; voiceSupported: boolean; inputRef: RefObject<HTMLInputElement>; onSubmit: (event: FormEvent) => void; onQueryChange: (query: string) => void; onFocus: () => void; onKeyDown: (event: KeyboardEvent) => void; onClear: () => void; onVisualSearchResults?: (products: unknown[], analysis: ProductAnalysis) => void; onVoice: () => void }) {
  return <form onSubmit={onSubmit}><div className="relative flex items-center"><Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" /><Input ref={inputRef} type="search" placeholder="Buscar produtos, categorias, fornecedores..." value={query} onChange={event => onQueryChange(event.target.value)} onFocus={onFocus} onKeyDown={onKeyDown} className="pl-10 h-10 bg-secondary/50 border-border/50 focus:bg-background transition-colors pr-28" /><div className="absolute right-1 flex items-center gap-0.5">{query && <Button type="button" variant="ghost" size="icon" aria-label="Fechar" className="h-8 w-8" onClick={onClear}><X className="h-4 w-4" /></Button>}<VisualSearchButton onResultsFound={(products, analysis) => onVisualSearchResults?.(products, analysis)} />{voiceSupported && <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-8 w-8 transition-all" onClick={onVoice} aria-label="Microfone"><Mic className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Buscar por voz</TooltipContent></Tooltip>}</div></div></form>;
}

function SuggestionItem({ result, selected, onSelect, onHover, onRemove }: { result: SearchResult; selected: boolean; onSelect: () => void; onHover: () => void; onRemove: () => void }) {
  return <button className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent", selected && "bg-accent")} onClick={onSelect} onMouseEnter={onHover}><span className="text-lg shrink-0">{result.icon}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{result.label}</p>{result.sublabel && <p className="text-xs text-muted-foreground truncate">{result.sublabel}</p>}</div>{result.type === 'history' && <Button variant="ghost" size="icon" aria-label="Fechar" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={event => { event.stopPropagation(); onRemove(); }}><X className="h-3 w-3" /></Button>}{result.type === 'product' && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}</button>;
}

function QuickSuggestions({ historyCount, suggestions, onClearHistory, onSearch }: { historyCount: number; suggestions: ReturnType<typeof useSearch>['quickSuggestions']; onClearHistory: () => void; onSearch: (term: string) => void }) {
  return <>{historyCount > 0 && <div className="px-4 py-2 border-b border-border"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Buscas recentes</span><Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={onClearHistory}>Limpar</Button></div></div>}<div className="p-4 border-t border-border"><p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-3"><TrendingUp className="h-3 w-3" />Sugestões populares</p><div className="flex flex-wrap gap-2">{suggestions.map(suggestion => <Badge key={suggestion.label} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => onSearch(suggestion.label)}>{suggestion.icon} {suggestion.label}</Badge>)}</div></div></>;
}

function SearchDropdown({ open, query, suggestions, selectedIndex, historyCount, quickSuggestions, dropdownRef, onSelect, onHover, onRemove, onClearHistory, onQuickSearch }: { open: boolean; query: string; suggestions: SearchResult[]; selectedIndex: number; historyCount: number; quickSuggestions: ReturnType<typeof useSearch>['quickSuggestions']; dropdownRef: RefObject<HTMLDivElement>; onSelect: (result: SearchResult) => void; onHover: (index: number) => void; onRemove: (label: string) => void; onClearHistory: () => void; onQuickSearch: (term: string) => void }) {
  if (!open) return null;
  return <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">{suggestions.length > 0 ? <div className="py-2">{suggestions.map((result, index) => <SuggestionItem key={result.id} result={result} selected={selectedIndex === index} onSelect={() => onSelect(result)} onHover={() => onHover(index)} onRemove={() => onRemove(result.label)} />)}</div> : query ? <div className="py-8 text-center"><p className="text-sm text-muted-foreground">Nenhum resultado para &quot;{query}&quot;</p></div> : null}{!query && <QuickSuggestions historyCount={historyCount} suggestions={quickSuggestions} onClearHistory={onClearHistory} onSearch={onQuickSearch} />}</div>;
}

function handleSearchKeyboard({ event, open, selectedIndex, suggestions, query, onIndex, onSelect, onSubmit, onClose }: { event: KeyboardEvent; open: boolean; selectedIndex: number; suggestions: SearchResult[]; query: string; onIndex: (index: number) => void; onSelect: (result: SearchResult) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  if (!open) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); onIndex(Math.min(selectedIndex + 1, suggestions.length - 1)); return; }
  if (event.key === 'ArrowUp') { event.preventDefault(); onIndex(selectedIndex > 0 ? selectedIndex - 1 : -1); return; }
  if (event.key === 'Escape') { onClose(); return; }
  if (event.key !== 'Enter') return;
  event.preventDefault();
  const selected = suggestions[selectedIndex];
  if (selectedIndex >= 0 && selected) onSelect(selected);
  else if (query.trim()) onSubmit(event);
}

function supportsVoiceSearch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export function AdvancedSearch({ onSearch, onVisualSearchResults, className }: AdvancedSearchProps) {
  const navigate = useNavigate();
  const { trackSearch } = useProductAnalytics();
  const { query, setQuery, suggestions, quickSuggestions, history, addToHistory, removeFromHistory, clearHistory } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeDropdown = () => { setIsOpen(false); setSelectedIndex(-1); };
  const handleVoiceAction = useCallback((action: VoiceAgentAction) => applyVoiceAction({ action, setQuery, close: () => setIsVoiceOverlayOpen(false), navigate, onSearch }), [navigate, onSearch, setQuery]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const outsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);
      const outsideInput = inputRef.current && !inputRef.current.contains(event.target as Node);
      if (outsideDropdown && outsideInput) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleSelect = (result: SearchResult) => { routeSearchResult({ result, navigate, setQuery, addToHistory, onSearch }); closeDropdown(); };
  const handleQuickSearch = (term: string) => { setQuery(term); addToHistory(term); onSearch?.(term); setIsOpen(false); };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    addToHistory(query);
    onSearch?.(query);
    trackSearch({ searchTerm: query, resultsCount: suggestions.filter(suggestion => suggestion.type === 'product').length });
    setIsOpen(false);
  };
  const handleQueryChange = (value: string) => { setQuery(value); setIsOpen(true); setSelectedIndex(-1); };
  const handleClear = () => { setQuery(''); inputRef.current?.focus(); };
  const handleKeyDown = (event: KeyboardEvent) => handleSearchKeyboard({ event, open: isOpen, selectedIndex, suggestions, query, onIndex: setSelectedIndex, onSelect: handleSelect, onSubmit: handleSubmit, onClose: closeDropdown });
  return <div className={cn('relative', className)}><SearchInputBar query={query} voiceSupported={supportsVoiceSearch()} inputRef={inputRef} onSubmit={handleSubmit} onQueryChange={handleQueryChange} onFocus={() => setIsOpen(true)} onKeyDown={handleKeyDown} onClear={handleClear} onVisualSearchResults={onVisualSearchResults} onVoice={() => setIsVoiceOverlayOpen(true)} /><SearchDropdown open={isOpen} query={query} suggestions={suggestions} selectedIndex={selectedIndex} historyCount={history.length} quickSuggestions={quickSuggestions} dropdownRef={dropdownRef} onSelect={handleSelect} onHover={setSelectedIndex} onRemove={removeFromHistory} onClearHistory={clearHistory} onQuickSearch={handleQuickSearch} />{isVoiceOverlayOpen && <Suspense fallback={null}><LazyVoiceOverlay isOpen={isVoiceOverlayOpen} onClose={() => setIsVoiceOverlayOpen(false)} onAction={handleVoiceAction} /></Suspense>}</div>;
}
