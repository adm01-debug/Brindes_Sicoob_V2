import { useRef, useEffect } from "react";
import { SmartSearchInput } from "@/components/search";
import { RecentlyViewedPopover } from "@/components/products/RecentlyViewedPopover";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CatalogHeaderProps {
  shouldShowCatalogSkeleton: boolean;
  totalEstimate: number | null;
  filteredCount: number;
  hasNextPage: boolean | undefined;
  onSelect: (result: { type: string; id: string; label: string }) => void;
  searchQuery?: string;
  onReset?: () => void;
  activeFiltersCount?: number;
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
}: CatalogHeaderProps) {
  const hasActiveConstraints = searchQuery.trim().length > 0 || activeFiltersCount > 0;
  const searchRef = useRef<HTMLDivElement>(null);

  // "/" shortcut to focus search (standard pattern: Notion, GitHub, Figma)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        const input = searchRef.current?.querySelector("input");
        input?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Reset / Home button — visible when search or filters are active */}
        {hasActiveConstraints && onReset && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onReset}
                className="shrink-0 h-9 w-9 border-brand/40 text-brand hover:bg-brand/10"
                aria-label="Voltar ao início"
              >
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voltar ao catálogo completo</TooltipContent>
          </Tooltip>
        )}

        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold whitespace-nowrap">
          Catálogo de Materiais
          <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2">
            · {shouldShowCatalogSkeleton
              ? "Carregando catálogo..."
              : hasActiveConstraints
                ? <>
                    <span className="text-brand font-semibold">{filteredCount.toLocaleString("pt-BR")}</span>
                    {totalEstimate ? ` de ${totalEstimate.toLocaleString("pt-BR")}` : ""} itens
                  </>
                : totalEstimate
                  ? `${totalEstimate.toLocaleString("pt-BR")} itens`
                  : `${filteredCount.toLocaleString("pt-BR")} itens`
            }
          </span>
        </h1>

        {/* Search inline next to product count on desktop */}
        <div className="hidden sm:block w-80 lg:w-[25rem]" ref={searchRef}>
          <SmartSearchInput
            placeholder="Buscar materiais…  /"
            onSelect={onSelect}
            className="w-full"
          />
        </div>

        <div className="hidden sm:block">
          <RecentlyViewedPopover maxVisible={10} />
        </div>
      </div>

      {/* Search full-width on mobile */}
      <div className="flex items-center gap-2 w-full sm:hidden">
        <SmartSearchInput
          placeholder="Buscar materiais..."
          onSelect={onSelect}
          className="flex-1"
        />
      </div>
      
    </div>
  );
}