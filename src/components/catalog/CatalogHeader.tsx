import { useRef, useEffect, useState } from "react";
import { SmartSearchInput } from "@/components/search";
import { RecentlyViewedPopover } from "@/components/products/RecentlyViewedPopover";
import { Clock, Home, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CatalogHeaderProps {
  shouldShowCatalogSkeleton: boolean;
  totalEstimate: number | null;
  filteredCount: number;
  hasNextPage: boolean | undefined;
  onSelect: (result: { type: string; id: string; label: string }) => void;
  searchQuery?: string;
  onReset?: () => void;
  activeFiltersCount?: number;
  searchHistory?: string[];
  onClearSearchHistory?: () => void;
  historyScope?: string;
}

function shouldFocusCatalogSearch(event: KeyboardEvent): boolean {
  if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target as HTMLElement | null;
  if (!target) return true;
  return target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable;
}

function productCountLabel({
  shouldShowCatalogSkeleton,
  hasActiveConstraints,
  filteredCount,
  totalEstimate,
  hasNextPage,
}: Pick<CatalogHeaderProps, "shouldShowCatalogSkeleton" | "filteredCount" | "totalEstimate" | "hasNextPage"> & { hasActiveConstraints: boolean }): string {
  if (shouldShowCatalogSkeleton) return "Carregando produtos…";
  const count = hasActiveConstraints ? filteredCount : (totalEstimate ?? filteredCount);
  return `${count.toLocaleString("pt-BR")} ${hasNextPage ? "+" : ""} produtos`;
}

interface CatalogSearchHistoryProps {
  history: string[];
  onSelect: CatalogHeaderProps["onSelect"];
  onClear?: () => void;
}

function CatalogSearchHistory({ history, onSelect, onClear }: CatalogSearchHistoryProps) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;

  const selectHistoryTerm = (term: string, index: number) => {
    onSelect({ type: "history", id: `history-${index}`, label: term });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative h-11 w-11 shrink-0 rounded-xl border-[#c7dcda] text-[#426568] hover:border-[#79cfc6] hover:bg-[#e8f6f3] hover:text-[#006c68]"
                aria-label={`Abrir ${history.length} buscas recentes`}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                <Badge className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center border-2 border-background bg-[#007d74] px-1 text-[9px] text-white">
                  {history.length > 9 ? "9+" : history.length}
                </Badge>
              </Button>
            </PopoverTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>Buscas recentes</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-2" align="end">
        <div className="mb-2 flex items-center justify-between border-b border-border/60 px-2 pb-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#426568]">Buscas recentes</span>
          {onClear && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear} className="min-h-9 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar
            </Button>
          )}
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {history.slice(0, 8).map((term, index) => (
            <button
              key={`${term}-${index}`}
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#244f53] transition-colors hover:bg-[#e8f6f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008b80]"
              onClick={() => selectHistoryTerm(term, index)}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-[#008b80]" aria-hidden="true" />
              <span className="truncate">{term}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CatalogHeader({
  shouldShowCatalogSkeleton,
  totalEstimate,
  filteredCount,
  hasNextPage,
  onSelect,
  searchQuery = "",
  onReset,
  activeFiltersCount = 0,
  searchHistory = [],
  onClearSearchHistory,
  historyScope,
}: CatalogHeaderProps) {
  const hasActiveConstraints = searchQuery.trim().length > 0 || activeFiltersCount > 0;
  const searchRef = useRef<HTMLDivElement>(null);
  const countLabel = productCountLabel({ shouldShowCatalogSkeleton, hasActiveConstraints, filteredCount, totalEstimate, hasNextPage });

  // "/" shortcut to focus search (standard pattern: Notion, GitHub, Figma)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!shouldFocusCatalogSearch(e)) return;
      e.preventDefault();
      searchRef.current?.querySelector("input")?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00877c]">Seleção para sua próxima ação</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="catalog-heading" className="font-display text-2xl font-bold tracking-tight text-[#003f46] sm:text-3xl">
              Encontre o brinde certo
            </h2>
            <span className="text-sm font-medium text-muted-foreground" aria-live="polite">
              {countLabel}
            </span>
          </div>
        </div>
        <div className="hidden sm:block">
          <RecentlyViewedPopover maxVisible={10} />
        </div>
      </div>

      <div className="flex items-center gap-3" ref={searchRef}>
        {/* Reset / Home button — visible when search or filters are active */}
        {hasActiveConstraints && onReset && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onReset} className="h-9 w-9 shrink-0 border-brand/40 text-brand hover:bg-brand/10" aria-label="Voltar ao início">
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voltar ao catálogo completo</TooltipContent>
          </Tooltip>
        )}

        <div className="hidden flex-1 sm:block">
          <SmartSearchInput placeholder="Busque por produto, ocasião, cor ou faixa de preço…  /" onSelect={onSelect} className="w-full" historyScope={historyScope} />
        </div>
        <div className="flex-1 sm:hidden">
          <SmartSearchInput placeholder="Buscar produtos…" onSelect={onSelect} className="w-full" historyScope={historyScope} />
        </div>
        <CatalogSearchHistory history={searchHistory} onSelect={onSelect} onClear={onClearSearchHistory} />
      </div>
    </div>
  );
}
