import { Suspense } from "react";
import { SORT_OPTIONS } from "@/constants/filters";
import { Filter, ArrowUpDown, CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilterState } from "@/components/filters/FilterPanel";
import { StatsPopover, type StatItem } from "@/components/products/StatsPopover";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import type { ViewMode, SortOption } from "@/hooks/useCatalogState";
import { Skeleton } from "@/components/ui/skeleton";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const LazyFilterPanel = lazyWithRetry(() =>
  import("@/components/filters/FilterPanel").then((m) => ({ default: m.FilterPanel }))
);

function FilterPanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-6 w-3/4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

interface CatalogToolbarProps {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  activeFiltersCount: number;
  filterSheetOpen: boolean;
  setFilterSheetOpen: (open: boolean) => void;
  resetFilters: () => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  statBadges: StatItem[];
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  gridColumns: ColumnCount;
  setGridColumns: (c: ColumnCount) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount?: number;
  isEnrichingColors?: boolean;
  isPending?: boolean;
}

function FiltersSheet({ props }: { props: CatalogToolbarProps }) {
  return (
    <Sheet open={props.filterSheetOpen} onOpenChange={props.setFilterSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="px-2.5 sm:px-3 h-8 shadow-sm" aria-label="Abrir painel de filtros">
          <Filter className="h-4 w-4 sm:mr-2" aria-hidden="true" /><span className="hidden sm:inline">Filtros</span>
          {props.activeFiltersCount > 0 ? <Badge variant="accent" className="ml-1 sm:ml-2 h-5 min-w-5 text-xs bg-sicoob-green text-sicoob-green-dark border-none shadow-sm"><span className="sr-only">Ativos: </span>{props.activeFiltersCount}</Badge> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        {props.filterSheetOpen ? <Suspense fallback={<FilterPanelSkeleton />}><LazyFilterPanel filters={props.filters} onFilterChange={props.setFilters} onReset={props.resetFilters} activeFiltersCount={props.activeFiltersCount} /></Suspense> : null}
      </SheetContent>
    </Sheet>
  );
}

function SortControl({ sortBy, setSortBy }: Pick<CatalogToolbarProps, "sortBy" | "setSortBy">) {
  return (
    <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
      <SelectTrigger className="w-10 sm:w-44 h-8 shadow-sm" aria-label="Ordenar lista de produtos"><ArrowUpDown className="h-4 w-4 sm:mr-2 shrink-0" aria-hidden="true" /><span className="hidden sm:inline"><SelectValue placeholder="Ordenar" /></span></SelectTrigger>
      <SelectContent>{SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function CatalogStatus({ isEnrichingColors = false, isPending = false }: Pick<CatalogToolbarProps, "isEnrichingColors" | "isPending">) {
  return (
    <>
      <AnimatePresence>{isEnrichingColors ? <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/5 border border-primary/10"><Loader2 className="h-3 w-3 text-primary animate-spin" /><span className="text-[10px] text-primary/70 font-medium whitespace-nowrap">Refinando cores...</span></motion.div> : null}</AnimatePresence>
      {isPending ? <div className="flex items-center gap-1.5 px-2 py-1"><Loader2 className="h-3 w-3 text-muted-foreground animate-spin" /><span className="text-[10px] text-muted-foreground font-medium">Atualizando...</span></div> : null}
    </>
  );
}

function SelectionButton({ selectionMode, onToggleSelectionMode, selectedCount = 0 }: Pick<CatalogToolbarProps, "selectionMode" | "onToggleSelectionMode" | "selectedCount">) {
  const buttonClass = selectionMode ? "bg-sicoob-green text-white shadow-md hover:bg-sicoob-green/90" : "hover:border-sicoob-green/50";
  return (
    <Button variant={selectionMode ? "default" : "outline"} size="sm" className={cn("gap-1.5 h-8 transition-all relative", buttonClass)} onClick={onToggleSelectionMode}>
      <CheckSquare className="h-3.5 w-3.5" /><span className="hidden sm:inline text-xs">{selectionMode ? "Cancelar" : "Multiseleção Sicoob"}</span>
      <AnimatePresence>{selectionMode && selectedCount > 0 ? <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 25 }} className="absolute -top-2 -right-2"><Badge className="bg-destructive text-destructive-foreground h-5 min-w-5 text-[10px] font-bold px-1.5 py-0 flex items-center justify-center tabular-nums shadow-lg">{selectedCount}</Badge></motion.div> : null}</AnimatePresence>
    </Button>
  );
}

export function CatalogToolbar(props: CatalogToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap py-1">
      <div className="flex items-center gap-2 flex-shrink-0">
        <FiltersSheet props={props} />
        <SortControl sortBy={props.sortBy} setSortBy={props.setSortBy} />
        <div className="hidden sm:block"><StatsPopover stats={props.statBadges} isFiltered={props.activeFiltersCount > 0} /></div>
        <CatalogStatus isEnrichingColors={props.isEnrichingColors} isPending={props.isPending} />
      </div>

      <div className="flex items-center gap-2">
        <SelectionButton selectionMode={props.selectionMode} onToggleSelectionMode={props.onToggleSelectionMode} selectedCount={props.selectedCount} />
        <div className="hidden sm:block"><LayoutPopover viewMode={props.viewMode} setViewMode={props.setViewMode} gridColumns={props.gridColumns} setGridColumns={props.setGridColumns} /></div>
      </div>
    </div>
  );
}
